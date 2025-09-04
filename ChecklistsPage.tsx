import React, { useEffect, useRef, useState } from "react";
import {
  createChecklist,
  fetchChecklists,
  printChecklistText,
  type ChecklistRow,
  fetchChecklistItems,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  type ChecklistItemRow,
} from "./api";
import Spinner from "./Spinner";

const Empty = ({ message }: { message: string }) => (
  <div className="empty">{message}</div>
);


// lightweight settings read
const S_KEY = "app.settings.v1";
function S(){ try{ return JSON.parse(localStorage.getItem(S_KEY)||'{}'); }catch{ return {}; } }
const S0:any = S();
import { useToast } from "./Toast";

export default function ChecklistsPage() {
  const addToast = useToast();

  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [q, setQ] = useState(S0.rememberLastSearch ? (localStorage.getItem("ui.lastSearch") || "") : "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(S0.checklistDefaultCategory || "");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [items, setItems] = useState<Record<number, ChecklistItemRow[]>>({});
  const [itemText, setItemText] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const base:any = {}; if(q.trim()) base.q = q.trim(); base.sort = (S0.checklistDefaultSort || "name"); const data = await fetchChecklists(base);
      if (signal?.aborted) return;
      setRows(data);
    } catch (e: any) {
      if (e?.name !== "AbortError") addToast(e?.message || "Failed to load checklists");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const t = setTimeout(() => load(ctrl.signal), 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createChecklist({ name: name.trim(), category: (category.trim() || S0.checklistDefaultCategory || undefined) });
      await load();
      setName(""); setCategory("");
      addToast("Checklist created ?");
    } catch (e: any) {
      addToast(e?.message || "Failed to create checklist ?");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDownloadTxt(id: number) {
    try {
      const text = await printChecklistText(id);
      const dt = new Date();
      const stamp = dt.toISOString().replace(/[:T]/g, "-").slice(0, 19);
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `checklist_${id}_${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      addToast(`Downloaded checklist_${id}_${stamp}.txt ??`);
    } catch (e: any) {
      addToast(e?.message || "Failed to download checklist ?");
    }
  }

  async function onOpenChecklist(id: number) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next && !items[id]) {
      try {
        const rows = await fetchChecklistItems(id);
        setItems(prev => ({ ...prev, [id]: rows }));
      } catch (e: any) {
        addToast(e?.message || "Failed to load items ?");
      }
    }
  }

  async function onAddItem(e: React.FormEvent, checklistId: number) {
    e.preventDefault();
    if (!itemText.trim()) return;
    const text = itemText.trim();
    setItemText(""); // zero-friction UX
    try {
      await addChecklistItem(checklistId, text);
      const updated = await fetchChecklistItems(checklistId);
      setItems(prev => ({ ...prev, [checklistId]: updated }));
      addToast("Item added ?");
    } catch (e: any) {
      addToast(e?.message || "Failed to add item ?");
      // put the text back so the user doesn’t lose it
      setItemText(text);
    }
  }

  async function onToggleItem(checklistId: number, item: ChecklistItemRow) {
    // Optimistic toggle for snappy UX
    setItems(prev => ({
      ...prev,
      [checklistId]: prev[checklistId].map(it => it.id === item.id ? { ...it, done: it.done ? 0 : 1 } : it)
    }));
    try {
      const res = await toggleChecklistItem(checklistId, item.id);
      // ensure state matches server response
      setItems(prev => ({
        ...prev,
        [checklistId]: prev[checklistId].map(it => it.id === item.id ? { ...it, done: res.done } : it)
      }));
    } catch (e: any) {
      // revert if failed
      setItems(prev => ({
        ...prev,
        [checklistId]: prev[checklistId].map(it => it.id === item.id ? { ...it, done: item.done } : it)
      }));
      addToast(e?.message || "Failed to toggle item ?");
    }
  }

  async function onDeleteItem(checklistId: number, itemId: number) {
    const prevItems = items[checklistId] || [];
    // optimistic remove
    setItems(prev => ({ ...prev, [checklistId]: prevItems.filter(it => it.id !== itemId) }));
    try {
      await deleteChecklistItem(checklistId, itemId);
      addToast("Item deleted ???");
    } catch (e: any) {
      // revert on failure
      setItems(prev => ({ ...prev, [checklistId]: prevItems }));
      addToast(e?.message || "Failed to delete item ?");
    }
  }

  return (
    <div className="container main" style={{ maxWidth: 900 }}>
      <h2 style={{ marginTop: 0 }}>Checklists</h2>

      <div className="card" style={{ padding: 16 }}>
        <form onSubmit={onCreate} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8 }}>
          <input className="input" placeholder="New checklist name..." value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Category (optional)" value={category} onChange={e=>setCategory(e.target.value)} />
          <button className="btn primary" disabled={submitting || !name.trim()}>{submitting ? "Saving..." : "Add"}</button>
        </form>
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <input className="input" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} style={{ flex: 1 }} />
          <button className="btn" onClick={()=>load()} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {loading && <Spinner label="Loading checklists" />}
        {!loading && rows.length === 0 && <Empty message="No checklists found." />}

        {rows.map((r) => (
          <div key={r.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong>{r.name}</strong>
                {r.category && <span className="badge">{r.category}</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => onOpenChecklist(r.id)}>{openId === r.id ? "Close" : "Open"}</button>
                <button className="btn" onClick={() => onDownloadTxt(r.id)}>Download .txt</button>
              </div>
            </div>

            {openId === r.id && (
              <div style={{ marginTop: 10 }}>
                {items[r.id] ? (
                  <ul style={{ paddingLeft: 20 }}>
                    {items[r.id].map(it => (
                      <li key={it.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={!!it.done} onChange={()=>onToggleItem(r.id, it)} />
                        <span style={{ textDecoration: it.done ? "line-through" : "none" }}>{it.text}</span>
                        <button className="btn small danger" onClick={()=>onDeleteItem(r.id, it.id)}>x</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Spinner label="Loading items..." />
                )}
                <form onSubmit={(e)=>onAddItem(e, r.id)} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    className="input"
                    placeholder="New item..."
                    value={itemText}
                    onChange={e=>setItemText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn primary">Add Item</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

