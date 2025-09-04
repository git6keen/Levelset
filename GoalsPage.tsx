import React, { useEffect, useMemo, useState } from "react";

/* ================== local storage helpers ================== */
function readJSON<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback; }
  catch { return fallback; }
}
function writeJSON<T>(key: string, v: T) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

/* ================== daily goals ================== */
type DailyGoal = { id: string; text: string; done?: boolean; created_at: string };
const DG_KEY = "daily_goals_v1";
const DG_LAST = "daily_goals_last_reset_v1";

/* ================== extended goals ================== */
type ExtGoal = { id: string; title: string; note?: string; progress: number; total: number; created_at: string };
const EG_KEY = "extended_goals_v1";

/* small utils */
const uid = (p="id") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const today = () => new Date().toISOString().slice(0,10);

export default function GoalsPage() {
  // --- Daily goals state
  const [daily, setDaily] = useState<DailyGoal[]>(() => readJSON<DailyGoal[]>(DG_KEY, []));
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");

  // reset daily “done” once per day
  useEffect(() => {
    const last = localStorage.getItem(DG_LAST);
    const t = today();
    if (last !== t) {
      setDaily(d => d.map(x => ({ ...x, done: false })));
      localStorage.setItem(DG_LAST, t);
    }
  }, []);

  useEffect(() => writeJSON(DG_KEY, daily), [daily]);

  function addDaily(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setDaily(prev => [{ id: uid("dg"), text, done: false, created_at: new Date().toISOString() }, ...prev]);
    setInput("");
  }
  function toggleDaily(id: string) {
    setDaily(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  }
  function removeDaily(id: string) {
    setDaily(prev => prev.filter(g => g.id !== id));
  }

  const completedCt = useMemo(() => daily.filter(d => d.done).length, [daily]);

  // --- Extended goals state
  const [ext, setExt] = useState<ExtGoal[]>(() => readJSON<ExtGoal[]>(EG_KEY, []));
  const [tTitle, setTTitle] = useState("");
  const [tTotal, setTTotal] = useState<number>(10);
  const [tNote, setTNote] = useState("");

  useEffect(() => writeJSON(EG_KEY, ext), [ext]);

  function addExt(e: React.FormEvent) {
    e.preventDefault();
    const title = tTitle.trim();
    const total = Math.max(1, Math.floor(Number(tTotal) || 1));
    if (!title) { setStatus("Title required"); return; }
    setExt(prev => [{ id: uid("eg"), title, note: tNote.trim() || undefined, progress: 0, total, created_at: new Date().toISOString() }, ...prev]);
    setTTitle(""); setTNote(""); setTTotal(10); setStatus("Added.");
    setTimeout(()=>setStatus(""), 1200);
  }
  function bump(id: string, delta: number) {
    setExt(prev => prev.map(g => g.id === id ? { ...g, progress: Math.min(g.total, Math.max(0, g.progress + delta)) } : g));
  }
  function removeExt(id: string) {
    setExt(prev => prev.filter(g => g.id !== id));
  }

  return (
    <div className="container main">
      {/* Daily Goals */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <h3 style={{ margin:0 }}>Daily Goals</h3>
          <span className="badge">{completedCt}/{daily.length} today</span>
          <span className="muted" style={{ marginLeft: "auto" }}>Resets daily</span>
        </div>

        <form onSubmit={addDaily} className="toolbar" style={{ gap:8, marginTop:12 }}>
          <input className="input" placeholder="Add a daily goal (e.g., Read 20 minutes)" value={input} onChange={e=>setInput(e.target.value)} />
          <button className="btn primary" type="submit">Add</button>
          <button className="btn" type="button" onClick={()=>{ setDaily(d => d.map(x => ({ ...x, done:false }))); localStorage.setItem(DG_LAST, today()); }}>Reset Today</button>
        </form>

        <div style={{ marginTop:10 }}>
          {daily.length === 0 ? (
            <span className="empty">No daily goals yet.</span>
          ) : (
            <ul style={{ paddingLeft:18 }}>
              {daily.map(g => (
                <li key={g.id} style={{ display:"flex", alignItems:"center", gap:8, margin: "4px 0" }}>
                  <input type="checkbox" checked={!!g.done} onChange={()=>toggleDaily(g.id)} />
                  <span style={{ textDecoration: g.done ? "line-through" : "none" }}>{g.text}</span>
                  <button className="btn small danger" onClick={()=>removeDaily(g.id)} style={{ marginLeft:"auto" }}>x</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ height:12 }} />

      {/* Extended Goals */}
      <div className="card">
        <div style={{ display:"flex", alignItems:"center" }}>
          <h3 style={{ margin:0 }}>Extended Goals</h3>
          <span className="badge" style={{ marginLeft:8 }}>{ext.length}</span>
          <span className="badge" style={{ marginLeft:"auto" }}>{status}</span>
        </div>

        <form onSubmit={addExt} className="toolbar" style={{ gap:8, marginTop:12, flexWrap:"wrap" }}>
          <input className="input" placeholder="Goal title (e.g., Couch to 5K)" value={tTitle} onChange={e=>setTTitle(e.target.value)} style={{ minWidth:260 }} />
          <input className="input" type="number" min={1} value={tTotal} onChange={e=>setTTotal(Number(e.target.value))} style={{ width:120 }} />
          <input className="input" placeholder="Note (optional)" value={tNote} onChange={e=>setTNote(e.target.value)} style={{ minWidth:260 }} />
          <button className="btn primary">Add</button>
        </form>

        <div className="grid cols-1" style={{ gap:8, marginTop:10 }}>
          {ext.length === 0 ? (
            <span className="empty">No extended goals yet.</span>
          ) : ext.map(g => {
            const pct = Math.round((g.progress / Math.max(1,g.total)) * 100);
            return (
              <div key={g.id} className="card" style={{ padding:10 }}>
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
                  <div style={{ fontWeight:600 }}>{g.title}</div>
                  <div className="muted" style={{ fontSize:12 }}>{g.progress}/{g.total} • {pct}%</div>
                </div>
                {g.note && <div className="muted" style={{ fontSize:13, marginTop:4 }}>{g.note}</div>}
                <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden", border:"1px solid #e5e7eb", marginTop:6 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:"#6366f1" }} />
                </div>
                <div className="toolbar" style={{ gap:8, marginTop:8 }}>
                  <button className="btn" type="button" onClick={()=>bump(g.id, +1)}>+1</button>
                  <button className="btn" type="button" disabled={g.progress<=0} onClick={()=>bump(g.id, -1)}>-1</button>
                  <button className="btn danger" style={{ marginLeft:"auto" }} onClick={()=>removeExt(g.id)}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
