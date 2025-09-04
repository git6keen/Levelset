import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTasks, type TaskRow } from "./api";
import DashboardDailyGoals from "./DashboardDailyGoals";
import DashboardExtendedGoals from "./DashboardExtendedGoals";


/* ===========================================================
   Local helpers (no extra imports; PowerShell-pastable)
=========================================================== */

/** read/write JSON to localStorage safely */
function readJSON<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : fallback; }
  catch { return fallback; }
}
function writeJSON<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

/** format age like “3h ago” */
function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** clamp array into a new array (non-mutating) */
function clamp<T>(arr: T[], n: number): T[] {
  return Array.isArray(arr) ? arr.slice(0, Math.max(0, n)) : [];
}

/** date helpers */
const now = () => new Date();
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}
function withinLastDays(iso?: string, days = 7) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  return t >= daysAgo(days).getTime();
}

/* ===========================================================
   Task Categories (user-defined, local only)
   - Purely client-side filtering of tasks by keyword query
   - No DB write needed (server schema lacks category write)
=========================================================== */

type TaskCategory = {
  id: string;
  name: string;
  color: string;     // e.g. #2563eb
  query: string;     // simple substring match against task.title (case-insensitive)
  order: number;     // sort order in Dashboard
  collapsed?: boolean;       // user toggled hide
  showOlderToggle?: boolean; // internal: if there were older results beyond 7 days
};

const CAT_KEY = "task_board.categories.v1";
const DEFAULT_CATS: TaskCategory[] = [
  { id: "daily",   name: "Daily Goals",     color: "#2563eb", query: "daily",     order: 1 },
  { id: "general", name: "General Tasks",   color: "#10b981", query: "task",      order: 2 },
  { id: "active",  name: "Physical Activity", color: "#f59e0b", query: "walk|gym|run|yoga", order: 3 },
];

function loadCategories(): TaskCategory[] {
  const saved = readJSON<TaskCategory[]>(CAT_KEY, []);
  if (!saved || !saved.length) {
    writeJSON(CAT_KEY, DEFAULT_CATS);
    return DEFAULT_CATS;
  }
  // ensure required fields exist
  return saved.map((c, i) => ({
    id: c.id || `cat_${i}`,
    name: c.name || `Category ${i+1}`,
    color: c.color || "#2563eb",
    query: c.query || "",
    order: typeof c.order === "number" ? c.order : i+1,
    collapsed: !!c.collapsed,
  })).sort((a,b) => a.order - b.order);
}

/* ===========================================================
   Rewards/Title Snapshot (read from RewardsPage local storage)
=========================================================== */

type LedgerRow = { id: string; group_id: string; delta: number; created_at: string; reason?: string };
type Grant = { id: string; title: string; note?: string; granted_at: string; deltas: { group_id: string; delta: number }[] };

function computeRenownSnapshot() {
  const ledger = readJSON<LedgerRow[]>("renown_ledger", []);
  const grants = readJSON<Grant[]>("reward_grants", []);
  const perGroup: Record<string, number> = {};
  for (const l of ledger) perGroup[l.group_id] = (perGroup[l.group_id] || 0) + l.delta;
  const total = Object.values(perGroup).reduce((s, n) => s + n, 0);
  // title tiers (mirror RewardsPage)
  const TITLE_TIERS = [
    { min: 0,    name: "Novice" },
    { min: 50,   name: "Contributor" },
    { min: 150,  name: "Trusted" },
    { min: 300,  name: "Respected" },
    { min: 600,  name: "Esteemed" },
    { min: 1000, name: "Luminary" },
  ];
  let title = TITLE_TIERS[0].name;
  for (const t of TITLE_TIERS) if (total >= t.min) title = t.name;
  const recentGrants = grants
    .slice()
    .sort((a,b)=> b.granted_at.localeCompare(a.granted_at))
    .slice(0, 5);
  return { total, perGroup, title, recentGrants };
}

/* ===========================================================
   Component
=========================================================== */

export default function Dashboard() {
  const [status, setStatus] = useState<string>("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [cats, setCats] = useState<TaskCategory[]>(() => loadCategories());
  const [showRecentDays] = useState<number>(7); // fixed per requirement

  // Load tasks
  async function reloadTasks() {
    setStatus("Loading");
    try {
      const list = await fetchTasks({ sort: "created_at" });
      setTasks(list);
      setStatus("Ready");
    } catch (e:any) {
      console.error(e);
      setTasks([]);
      setStatus(e?.message || "Error loading tasks");
    }
  }
  useEffect(() => { reloadTasks(); }, []);

  // Renown snapshot (local storage)
  const renown = useMemo(() => computeRenownSnapshot(), [tasks]); // recompute occasionally; cheap

  // Derived: counts and top slices
  const openCount = tasks.length;
  const recentTasks = useMemo(
    () => tasks.filter(t => withinLastDays(t.created_at || "", showRecentDays)),
    [tasks, showRecentDays]
  );

  // Categories -> filtered lists
  const catLists = useMemo(() => {
    const lists: { cat: TaskCategory; recent: TaskRow[]; older: TaskRow[]; hasRecent: boolean; hasOlder: boolean }[] = [];
    for (const c of cats.slice().sort((a,b)=>a.order-b.order)) {
      const pattern = (c.query || "").trim();
      const rx = pattern
        ? new RegExp(pattern, "i")   // allow simple alternation like "walk|run"
        : null;
      const match = (t: TaskRow) => {
        if (!rx) return true; // if empty query, show all
        return rx.test(t.title || "");
      };
      const all = tasks.filter(match);
      const recent = all.filter(t => withinLastDays(t.created_at || "", showRecentDays));
      const older = all.filter(t => !withinLastDays(t.created_at || "", showRecentDays));
      lists.push({
        cat: c,
        recent,
        older,
        hasRecent: recent.length > 0,
        hasOlder: older.length > 0,
      });
    }
    return lists;
  }, [cats, tasks, showRecentDays]);

  // Persist categories on change
  useEffect(() => { writeJSON(CAT_KEY, cats); }, [cats]);

  // Category management UI state
  const [manageOpen, setManageOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<TaskCategory>>({ name: "", color: "#2563eb", query: "" });

  function addCategory() {
    const name = (draft.name || "").trim();
    if (!name) return;
    const id = (name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `cat_${Date.now()}`);
    const order = (cats[cats.length - 1]?.order || 0) + 1;
    const next: TaskCategory = {
      id,
      name,
      color: draft.color || "#2563eb",
      query: (draft.query || "").trim(),
      order,
    };
    setCats(prev => [...prev, next]);
    setDraft({ name: "", color: "#2563eb", query: "" });
  }
  function updateCategory(id: string, patch: Partial<TaskCategory>) {
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function removeCategory(id: string) {
    setCats(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })));
  }
  function move(id: string, dir: -1 | 1) {
    const arr = cats.slice().sort((a,b)=>a.order-b.order);
    const idx = arr.findIndex(c => c.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[idx].order;
    arr[idx].order = arr[j].order;
    arr[j].order = tmp;
    setCats(arr);
  }

  // Hide-empty behavior (leave header bar if no recent; allow expand older)
  const [showOlderFor, setShowOlderFor] = useState<Record<string, boolean>>({});

  /* ========================= Render ========================= */
  return (
    <div className="container main">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Dashboard</h3>
        <span className="badge">{status}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn" onClick={reloadTasks}>Refresh</button>
          <button className="btn" onClick={()=>setManageOpen(v=>!v)}>{manageOpen ? "Close Category Manager" : "Manage Categories"}</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid cols-3">
        <div className="card kpi">
          <div className="label">Open Tasks</div>
          <div className="value">{openCount}</div>
          <div className="label muted">Visible in list</div>
        </div>
        <div className="card kpi">
          <div className="label">Renown</div>
          <div className="value">{renown.total}</div>
          <div className="label muted">Title: {renown.title}</div>
        </div>
        <div className="card kpi">
          <div className="label">Recent (≤ {showRecentDays}d)</div>
          <div className="value">{recentTasks.length}</div>
          <div className="label muted">Newly added</div>
        </div>
      </div>
<div style={{ height: 12 }} />
<div className="grid cols-2">
  <DashboardDailyGoals />
  <DashboardExtendedGoals />
</div>


      <div style={{ height: 12 }} />

      {/* Recent Activity — last 7 days; keep compact with horizontal scroll */}
      {recentTasks.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Recent (last {showRecentDays} days)</h3>
            <span className="badge" style={{ marginLeft: 8 }}>{recentTasks.length}</span>
            <div style={{ marginLeft: "auto" }}>
              <Link className="btn" to="/tasks">View All</Link>
            </div>
          </div>
          <div className="hscroll" style={{ marginTop: 10 }}>
            {clamp(recentTasks, 50).map(t => (
              <div key={t.task_id} className="card" style={{ minWidth: 240, padding: 10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                  <div style={{ fontWeight: 700 }}>{t.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{timeAgo(t.created_at || "")}</div>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {(t.description && t.description.trim()) || "\u00A0"}
                </div>
                <div style={{ marginTop: 6 }}>
                  <PriorityPill p={t.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category boards */}
      <div style={{ height: 12 }} />
      <div className="grid cols-2">
        {catLists.map(({ cat, recent, older, hasRecent, hasOlder }) => {
          const showingOlder = !!showOlderFor[cat.id];
          const showBody = hasRecent || (showingOlder && hasOlder);
          return (
            <div key={cat.id} className="card">
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="cat-dot" style={{ background: cat.color }} />
                <h3 style={{ margin: 0 }}>{cat.name}</h3>
                <span className="badge">{hasRecent ? `${recent.length} recent` : "no recent"}</span>
                {hasOlder && !hasRecent && (
                  <button
                    className="btn small ghost"
                    style={{ marginLeft: 6 }}
                    onClick={() => setShowOlderFor(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  >
                    {showingOlder ? "Hide older" : "Show older"}
                  </button>
                )}
                <div style={{ marginLeft: "auto" }}>
                  {/* quick collapse toggle */}
                  <button className="btn small" onClick={() => updateCategory(cat.id, { collapsed: !cat.collapsed })}>
                    {cat.collapsed ? "Expand" : "Collapse"}
                  </button>
                </div>
              </div>

              {/* Body (hide if user collapsed OR empty recent & not showing older) */}
              {!cat.collapsed && showBody && (
                <div style={{ marginTop: 10 }}>
                  <div className="grid cols-1" style={{ gap: 8 }}>
                    {(hasRecent ? recent : older).slice(0, 8).map(t => (
                      <div key={t.task_id} className="card" style={{ padding: 10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{timeAgo(t.created_at || "")}</div>
                        </div>
                        <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                          {(t.description && t.description.trim()) || "\u00A0"}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <PriorityPill p={t.priority} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* If there are more items than shown, give a link */}
                  {((hasRecent ? recent : older).length > 8) && (
                    <div style={{ marginTop: 8 }}>
                      <Link className="btn" to="/tasks">See more</Link>
                    </div>
                  )}
                </div>
              )}

              {/* Empty-state hint when fully hidden */}
              {!cat.collapsed && !showBody && (
                <div style={{ marginTop: 8 }}>
                  <span className="empty">No items to show.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 12 }} />

      {/* Rewards preview (optional) */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Recent Recognitions</h3>
          <Link className="btn" to="/rewards">Open Rewards</Link>
        </div>
        {renown.recentGrants.length === 0 ? (
          <span className="empty">None yet</span>
        ) : (
          <div className="grid cols-1" style={{ gap: 8, marginTop: 8 }}>
            {renown.recentGrants.map(r => (
              <div key={r.id} className="card" style={{ padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{timeAgo(r.granted_at)}</div>
                </div>
                {r.note && <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>{r.note}</div>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {(r.deltas || []).map((d, i) => (
                    <span key={i} className="chip">
                      {d.group_id} {d.delta > 0 ? `+${d.delta}` : d.delta}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* ===========================================================
   Tiny pill for priority
=========================================================== */
function PriorityPill({ p }: { p: number }) {
  const map: { [k: number]: { bg: string; border: string; color: string } } = {
    1: { bg: "#ffe8e8", border: "#ffc4c4", color: "#991b1b" },
    2: { bg: "#fff1cf", border: "#ffd98a", color: "#92400e" },
    3: { bg: "#eef3ff", border: "#cfe0ff", color: "#1e3a8a" },
    4: { bg: "#eaf7ef", border: "#c8ecd9", color: "#065f46" },
    5: { bg: "#f3f4f6", border: "#e5e7eb", color: "#374151" },
  };
  const s = map[p] || map[3];
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      P{p}
    </span>
  );
}
