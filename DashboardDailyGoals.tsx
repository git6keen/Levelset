import React, { useEffect, useMemo, useState } from "react";

/** Local-only Daily Goals (no server calls)
    Storage key: daily_goals.v1
    Shape: { id:string; title:string; done:boolean; created_at:string }
**/
type Goal = { id:string; title:string; done:boolean; created_at:string };

const SKEY = "daily_goals.v1";
function readGoals(): Goal[] {
  try { const s = localStorage.getItem(SKEY); return s ? JSON.parse(s) as Goal[] : []; } catch { return []; }
}
function writeGoals(rows: Goal[]) {
  try { localStorage.setItem(SKEY, JSON.stringify(rows)); } catch {}
}
function uid() { return `g_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

export default function DashboardDailyGoals() {
  const [goals, setGoals] = useState<Goal[]>(() => readGoals());
  const [text, setText] = useState("");

  useEffect(() => { writeGoals(goals); }, [goals]);

  function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setGoals(prev => [{ id: uid(), title: t, done: false, created_at: new Date().toISOString() }, ...prev].slice(0, 20));
    setText("");
  }
  function toggle(id: string) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  }
  function remove(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id));
  }
  function clearCompleted() {
    setGoals(prev => prev.filter(g => !g.done));
  }

  const stats = useMemo(() => {
    const total = goals.length;
    const done = goals.filter(g => g.done).length;
    return { total, done };
  }, [goals]);

  return (
    <div className="card" style={{ display:"grid", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <h3 style={{ margin:0 }}>Daily Goals</h3>
        <span className="badge">{stats.done}/{stats.total} done</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <button className="btn" onClick={clearCompleted} disabled={!stats.done}>Clear Completed</button>
        </div>
      </div>

      <form onSubmit={addGoal} className="toolbar" style={{ gap:8 }}>
        <input className="input" placeholder="Add a goal for today…" value={text} onChange={e=>setText(e.target.value)} />
        <button className="btn primary" type="submit" disabled={!text.trim()}>Add</button>
      </form>

      {goals.length === 0 ? (
        <span className="empty">No daily goals yet. Add one above.</span>
      ) : (
        <div className="grid cols-1" style={{ gap:6 }}>
          {goals.map(g => (
            <div key={g.id} className="card" style={{ padding:8, display:"flex", alignItems:"center", gap:10 }}>
              <input type="checkbox" checked={g.done} onChange={()=>toggle(g.id)} />
              <div style={{ flex:1, textDecoration: g.done ? "line-through" : "none" }}>{g.title}</div>
              <button className="btn small danger" onClick={()=>remove(g.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
