import React, { useEffect, useMemo, useState } from "react";

/* ===========================================================
   RewardsPage — local-only renown tracker (Proto3)
   - Grants with per-group deltas
   - Ledger derived from grants
   - Achievements (simple rules)
   - Choose display title from unlocked tiers (persisted)
   - Compatible with Dashboard “open-grant” CustomEvent
=========================================================== */

/** ====================== Local storage helpers ====================== */
function readJSON<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback; }
  catch { return fallback; }
}
function writeJSON<T>(key: string, v: T) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }
function uid(prefix = "id"): string { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

/** ====================== Types ====================== */
type Group = { group_id: string; name: string };
type LedgerRow = { id: string; group_id: string; delta: number; reason?: string; source_type?: string; source_id?: string|number; created_at: string };
type Grant = { id: string; title: string; note?: string; source_type?: string; source_id?: string|number; granted_at: string; deltas: { group_id: string; delta: number }[] };

/** ====================== Defaults ====================== */
const DEFAULT_GROUPS: Group[] = [
  { group_id: "community", name: "Community" },
  { group_id: "neighbors", name: "Neighbors" },
  { group_id: "workplace", name: "Workplace" },
  { group_id: "family_net", name: "Family Network" },
];

/** ====================== Title tiers & selection ====================== */
const TITLE_TIERS = [
  { min: 0,    name: "Novice" },
  { min: 50,   name: "Contributor" },
  { min: 150,  name: "Trusted" },
  { min: 300,  name: "Respected" },
  { min: 600,  name: "Esteemed" },
  { min: 1000, name: "Luminary" },
];
function titleFor(total: number) { let t = TITLE_TIERS[0].name; for (const x of TITLE_TIERS) if (total >= x.min) t = x.name; return t; }
const TITLE_OVERRIDE_KEY = "profile_display_title.v1";

/** ====================== Achievements (simple rules) ====================== */
type Metrics = { grants: number; perGroupCounts: Record<string, number>; perGroupRenown: Record<string, number>; groupsTouched: number; totalRenown: number };
function computeMetrics(grants: Grant[], ledger: LedgerRow[]) : Metrics {
  const perGroupCounts: Record<string, number> = {};
  const perGroupRenown: Record<string, number> = {};
  for (const g of grants) for (const d of g.deltas) perGroupCounts[d.group_id] = (perGroupCounts[d.group_id] || 0) + 1;
  for (const l of ledger) perGroupRenown[l.group_id] = (perGroupRenown[l.group_id] || 0) + l.delta;
  const groupsTouched = Object.keys(perGroupCounts).length;
  const totalRenown = ledger.reduce((s,l)=>s+l.delta,0);
  return { grants: grants.length, perGroupCounts, perGroupRenown, groupsTouched, totalRenown };
}
const ACH = [
  { id:"first_grant", name:"First Notable Act", desc:"Record your first meaningful reward", test:(m:Metrics)=>m.grants>=1, progress:(m:Metrics)=>`${Math.min(1,m.grants)}/1` },
  { id:"five_grants", name:"On Your Way", desc:"Record 5 grants", test:(m:Metrics)=>m.grants>=5, progress:(m:Metrics)=>`${Math.min(5,m.grants)}/5` },
  { id:"broad_impact", name:"Broad Impact", desc:"Contributions across 3+ groups", test:(m:Metrics)=>m.groupsTouched>=3 },
  { id:"community_pillar", name:"Community Pillar", desc:"100+ community renown", test:(m:Metrics)=>(m.perGroupRenown["community"]||0) >= 100,
    progress:(m:Metrics)=>`${Math.min(100, m.perGroupRenown["community"]||0)}/100` },
];

/** ====================== Modal for Grant ====================== */
function useGrantModal() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{title:string; note:string; source_type?:string; source_id?:string|number}>({ title:"", note:"" });
  const [groupDeltas, setGroupDeltas] = useState<Record<string, number>>({}); // group_id -> delta

  function reset(prefill?: Partial<typeof draft>) {
    setDraft({ title:"", note:"", ...prefill });
    setGroupDeltas({});
  }

  function handleEvent(e: Event) {
    const ce = e as CustomEvent;
    reset(ce.detail || {});
    setOpen(true);
  }

  useEffect(()=>{
    window.addEventListener("open-grant", handleEvent as EventListener);
    return ()=> window.removeEventListener("open-grant", handleEvent as EventListener);
  },[]);

  return {
    open, setOpen, draft, setDraft, groupDeltas, setGroupDeltas,
    prefill: (p: Partial<typeof draft>) => reset(p),
  };
}

/** ====================== Modal for Title Selection ====================== */
function useTitleModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

/* ====================== Component ====================== */
export default function RewardsPage() {
  // state
  const [groups, setGroups] = useState<Group[]>(() => readJSON<Group[]>("renown_groups", DEFAULT_GROUPS));
  const [ledger, setLedger] = useState<LedgerRow[]>(() => readJSON<LedgerRow[]>("renown_ledger", []));
  const [grants, setGrants] = useState<Grant[]>(() => readJSON<Grant[]>("reward_grants", []));
  const [status, setStatus] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [gfilter, setGfilter] = useState<string>("all");

  // modals
  const grantModal = useGrantModal();
  const titleModal = useTitleModal();

  // persist
  useEffect(()=> writeJSON("renown_groups", groups), [groups]);
  useEffect(()=> writeJSON("renown_ledger", ledger), [ledger]);
  useEffect(()=> writeJSON("reward_grants", grants), [grants]);

  // derived renown totals
  const totals = useMemo(()=>{
    const t: Record<string, number> = {};
    for (const l of ledger) t[l.group_id] = (t[l.group_id] || 0) + l.delta;
    return t;
  },[ledger]);
  const totalAll = Object.values(totals).reduce((s,n)=>s+n,0);

  // title (computed vs chosen)
  const computedTitle = titleFor(totalAll);
  const [chosenTitle, setChosenTitle] = useState<string>(() => {
    const s = localStorage.getItem(TITLE_OVERRIDE_KEY);
    return s ? String(s) : "";
  });
  const activeTitle = (chosenTitle && isUnlocked(chosenTitle, totalAll)) ? chosenTitle : computedTitle;

  useEffect(() => {
    // if previously chosen title becomes invalid (lost progress), clear it
    if (chosenTitle && !isUnlocked(chosenTitle, totalAll)) {
      setChosenTitle("");
      try { localStorage.removeItem(TITLE_OVERRIDE_KEY); } catch {}
    }
  }, [chosenTitle, totalAll]);

  // metrics/achievements
  const metrics = useMemo(()=>computeMetrics(grants, ledger), [grants, ledger]);
  const unlocked = ACH.filter(a=>a.test(metrics));

  // filtered view
  const filtered = useMemo(()=>{
    return grants.filter(g=>{
      const matchesQ = q.trim() ? (g.title.toLowerCase().includes(q.trim().toLowerCase()) || (g.note||"").toLowerCase().includes(q.trim().toLowerCase())) : true;
      const matchesG = gfilter==="all" ? true : g.deltas.some(d=>d.group_id===gfilter);
      return matchesQ && matchesG;
    }).sort((a,b)=> (b.granted_at.localeCompare(a.granted_at)));
  }, [grants, q, gfilter]);

  // actions
  function addGrant(grantInput: { title:string; note?:string; source_type?:string; source_id?:string|number },
                    deltas: Record<string, number>) {
    const deltaPairs = Object.entries(deltas).filter(([,v])=>Number.isFinite(v) && v!==0)
      .map(([group_id, v])=>({ group_id, delta: Math.trunc(Number(v)) }));
    const grant: Grant = {
      id: uid("grant"),
      title: grantInput.title.trim(),
      note: grantInput.note?.trim() || undefined,
      source_type: grantInput.source_type,
      source_id: grantInput.source_id,
      granted_at: new Date().toISOString(),
      deltas: deltaPairs,
    };
    setGrants(prev => [grant, ...prev]);
    if (deltaPairs.length) {
      const rows: LedgerRow[] = deltaPairs.map(d => ({
        id: uid("lg"),
        group_id: d.group_id,
        delta: d.delta,
        reason: grant.title,
        source_type: grant.source_type,
        source_id: grant.source_id,
        created_at: grant.granted_at,
      }));
      setLedger(prev => [...rows, ...prev]);
    }
    setStatus("Reward recorded.");
  }

  function removeGrant(id: string) {
    const g = grants.find(x=>x.id===id);
    setGrants(prev => prev.filter(x=>x.id!==id));
    if (g) {
      // remove associated ledger rows that match this grant timestamp+reason (best-effort local link)
      setLedger(prev => prev.filter(l => !(l.created_at===g.granted_at && l.reason===g.title)));
    }
    setStatus("Removed.");
  }

  // modal submit
  function submitGrant() {
    const t = grantModal.draft.title.trim();
    if (!t) { setStatus("Title is required."); return; }
    addGrant(grantModal.draft, grantModal.groupDeltas);
    grantModal.setOpen(false);
  }

  // quick add group
  function addGroup() {
    const name = prompt("New group name?");
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"") || uid("grp");
    setGroups(prev => [...prev, { group_id: id, name: name.trim() }]);
  }

  // title selection helpers
  function isUnlocked(t: string, total: number) {
    const tier = TITLE_TIERS.find(x => x.name === t);
    if (!tier) return false;
    return total >= tier.min;
  }
  const unlockedTitles = useMemo(() => TITLE_TIERS.filter(t => totalAll >= t.min).map(t => t.name), [totalAll]);

  function chooseTitle(newTitle: string) {
    if (!isUnlocked(newTitle, totalAll)) return;
    setChosenTitle(newTitle);
    try { localStorage.setItem(TITLE_OVERRIDE_KEY, newTitle); } catch {}
    setStatus(`Display title set to “${newTitle}”.`);
    titleModal.setOpen(false);
  }

  useEffect(() => { setStatus(""); }, [q, gfilter]);

  /* ====================== Render ====================== */
  return (
    <div className="container main">
      <div className="card">

        {/* Header */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Earned Rewards</h3>
          <div className="chip">Display Title: <b style={{ marginLeft: 6 }}>{activeTitle}</b></div>
          <div className="chip">Total Renown: {totalAll}</div>
          <div className="toolbar" style={{ gap: 8, marginLeft: "auto" }}>
            <button className="btn" onClick={()=>grantModal.setOpen(true)}>Grant Reward</button>
            <button className="btn" onClick={addGroup}>Add Group</button>
            <button className="btn" onClick={()=>titleModal.setOpen(true)} disabled={unlockedTitles.length<=1}>Choose Title</button>
            <span className="badge">{status}</span>
          </div>
        </div>

        {/* Renown by group */}
        <div className="toolbar" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {groups.map(g => (
            <div key={g.group_id} className="chip">
              {g.name}: {totals[g.group_id] || 0}
            </div>
          ))}
        </div>

        {/* Badges/Achievements */}
        <div className="grid" style={{ marginTop: 12 }}>
          {unlocked.length ? (
            <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
              {unlocked.map(a => (
                <span key={a.id} className="badge" title={a.desc || ""}>{a.name}</span>
              ))}
            </div>
          ) : (
            <span className="muted">No badges yet — record meaningful rewards to earn them.</span>
          )}
        </div>

        {/* Filters */}
        <div className="toolbar" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Search earned rewards…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ minWidth: 240 }} />
          <select className="select" value={gfilter} onChange={(e)=>setGfilter(e.target.value)} style={{ width: 200 }}>
            <option value="all">All groups</option>
            {groups.map(g => <option key={g.group_id} value={g.group_id}>{g.name}</option>)}
          </select>
          <button className="btn" onClick={()=>{ setQ(""); setGfilter("all"); }}>Clear</button>
        </div>

        {/* Timeline */}
        <div className="grid" style={{ marginTop: 12 }}>
          {filtered.length === 0 ? (
            <div className="card"><span className="empty">No earned rewards yet</span></div>
          ) : filtered.map(gr => (
            <div key={gr.id} className="card" style={{ padding: 8, display: "grid", gap: 6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{gr.title}</div>
                <div className="badge muted">{new Date(gr.granted_at).toLocaleString()}</div>
                {gr.source_type && <div className="chip">{gr.source_type} #{String(gr.source_id ?? "")}</div>}
                <div style={{ marginLeft: "auto" }}>
                  <button className="btn" onClick={()=>removeGrant(gr.id)}>Remove</button>
                </div>
              </div>
              {gr.note && <div className="muted" style={{ fontSize: 13 }}>{gr.note}</div>}
              {gr.deltas.length>0 && (
                <div className="toolbar" style={{ gap: 6, flexWrap: "wrap" }}>
                  {gr.deltas.map(d => (
                    <span key={gr.id + d.group_id + d.delta} className="chip">
                      {(groups.find(x=>x.group_id===d.group_id)?.name || d.group_id)}: {d.delta>0?`+${d.delta}`:d.delta}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="badge muted" style={{ marginTop: 8 }}>
          Tip: from Tasks, call <code>{`window.dispatchEvent(new CustomEvent("open-grant", { detail: { title, note, source_type:"task", source_id:id } }))`}</code>
          to open this modal prefilled.
        </div>
      </div>

      {/* ===== Grant Modal ===== */}
      {grantModal.open && (
        <div className="card" style={{
          position:"fixed", inset:"0", background:"rgba(0,0,0,.4)", display:"grid", placeItems:"center", zIndex: 9999
        }}>
          <div className="card" style={{ padding: 12, width: 520, maxWidth: "95vw" }}>
            <div style={{ display:"flex", alignItems:"center" }}>
              <h4 style={{ margin: 0 }}>Grant Reward</h4>
              <button className="btn" style={{ marginLeft: "auto" }} onClick={()=>grantModal.setOpen(false)}>Close</button>
            </div>

            <div className="grid" style={{ marginTop: 12 }}>
              <div className="grid">
                <label>Title *</label>
                <input className="input" value={grantModal.draft.title} onChange={(e)=>grantModal.setDraft({ ...grantModal.draft, title:e.target.value })} placeholder="e.g., Helped neighbor with move" />
              </div>
              <div className="grid">
                <label>Note</label>
                <textarea className="textarea" rows={3} value={grantModal.draft.note||""} onChange={(e)=>grantModal.setDraft({ ...grantModal.draft, note:e.target.value })} placeholder="Context, links, or details (optional)" />
              </div>
            </div>

            <div className="grid" style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600 }}>Renown adjustments (per group)</label>
              <div className="grid">
                {groups.map(g => {
                  const val = grantModal.groupDeltas[g.group_id] ?? 0;
                  return (
                    <div key={g.group_id} className="toolbar" style={{ gap: 8 }}>
                      <div className="chip" style={{ minWidth: 140 }}>{g.name}</div>
                      <input className="input" type="number" value={String(val)}
                             onChange={(e)=> grantModal.setGroupDeltas({ ...grantModal.groupDeltas, [g.group_id]: Math.trunc(Number(e.target.value||0)) })}
                             style={{ width: 120 }} />
                      <span className="badge muted">(-10..+10 typical)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="toolbar" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={submitGrant} disabled={!grantModal.draft.title.trim()}>Save</button>
              <button className="btn" onClick={()=>grantModal.setOpen(false)}>Cancel</button>
              <span className="badge">{status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== Title Selection Modal ===== */}
      {titleModal.open && (
        <div className="card" style={{
          position:"fixed", inset:"0", background:"rgba(0,0,0,.4)", display:"grid", placeItems:"center", zIndex: 9999
        }}>
          <div className="card" style={{ padding: 12, width: 480, maxWidth: "95vw" }}>
            <div style={{ display:"flex", alignItems:"center" }}>
              <h4 style={{ margin: 0 }}>Choose Display Title</h4>
              <button className="btn" style={{ marginLeft: "auto" }} onClick={()=>titleModal.setOpen(false)}>Close</button>
            </div>

            <div className="grid" style={{ marginTop: 10, gap: 8 }}>
              <div className="toolbar" style={{ flexWrap:"wrap", gap: 8 }}>
                {TITLE_TIERS.map(t => {
                  const unlocked = totalAll >= t.min;
                  const selected = (chosenTitle || computedTitle) === t.name && chosenTitle === t.name;
                  return (
                    <button
                      key={t.name}
                      className={`btn ${selected ? "success" : ""}`}
                      disabled={!unlocked}
                      title={unlocked ? `Unlocked (≥ ${t.min})` : `Locked (need ≥ ${t.min})`}
                      onClick={()=>chooseTitle(t.name)}
                    >
                      {t.name} {unlocked ? "" : "🔒"}
                    </button>
                  );
                })}
              </div>
              <div className="toolbar">
                <button className="btn ghost" onClick={()=>{ setChosenTitle(""); try{ localStorage.removeItem(TITLE_OVERRIDE_KEY);}catch{}; setStatus("Using computed title."); titleModal.setOpen(false); }}>
                  Use Computed Title ({computedTitle})
                </button>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Your chosen display title is stored locally and may be shown on the Dashboard in future updates.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
