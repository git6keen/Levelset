import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchQuests, type Quest } from "./api"; // stubbed in Proto3; safe to import

export default function DashboardExtendedGoals() {
  const [qs, setQs] = useState<Quest[]>([]);
  useEffect(() => { (async () => { try { setQs(await fetchQuests()); } catch { setQs([]); } })(); }, []);

  return (
    <div className="card">
      <div style={{ display:"flex", alignItems:"center" }}>
        <h3 style={{ margin:0 }}>Extended Goals</h3>
        <div style={{ marginLeft:"auto" }}>
          <Link to="/quests" className="btn">Open Quests</Link>
        </div>
      </div>

      {qs.length === 0 ? (
        <div style={{ marginTop:8 }}><span className="empty">No quests yet.</span></div>
      ) : (
        <div className="grid cols-1" style={{ gap:8, marginTop:8 }}>
          {qs.slice(0,3).map(q => (
            <div key={q.id} className="card" style={{ padding:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                <div style={{ fontWeight:600 }}>{q.title}</div>
                <div className="muted" style={{ fontSize:12 }}>{q.done_steps}/{q.total_steps} • {q.percent}%</div>
              </div>
              {q.summary && <div className="muted" style={{ fontSize:13, marginTop:4 }}>{q.summary}</div>}
              <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden", border:"1px solid #e5e7eb", marginTop:6 }}>
                <div style={{ height:"100%", width:`${q.percent}%`, background:"#6366f1" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
