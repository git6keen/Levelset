import React, { useEffect, useMemo, useState } from "react";

type Entry = { id: string; ts: number; mood: number; energy: number; stress: number; tags: string[]; notes: string; };

export default function JournalForm(props: {
  storageKey?: string;
  showList?: boolean;
  onSaved?: (e: Entry) => void;
}) {
  const storageKey = props.storageKey ?? "journal_entries_v1";
  const showList = props.showList ?? true;

  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Entry[]>([]);

  useEffect(() => {
    try { setRows((JSON.parse(localStorage.getItem(storageKey) || "[]") as Entry[]).sort((a,b)=>b.ts-a.ts)); }
    catch { setRows([]); }
  }, [storageKey]);

  function saveRows(next: Entry[]) {
    const sorted = next.sort((a,b)=>b.ts-a.ts);
    setRows(sorted);
    localStorage.setItem(storageKey, JSON.stringify(sorted));
  }

  function saveEntry() {
    const e: Entry = {
      id: Math.random().toString(36).slice(2),
      ts: Date.now(),
      mood, energy, stress,
      tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
      notes: notes.trim()
    };
    saveRows([e, ...rows]);
    setNotes("");
    props.onSaved?.(e);
  }

  function del(id: string) {
    saveRows(rows.filter(r => r.id !== id));
  }

  function dlTxt(e: Entry) {
    const score = Math.round((e.mood + e.energy + (11 - e.stress)) / 3);
    const text = [
      `Date: ${new Date(e.ts).toLocaleString()}`,
      `Mood: ${e.mood}`,
      `Energy: ${e.energy}`,
      `Stress: ${e.stress}`,
      `Score: ${score}`,
      `Tags: ${e.tags.join(", ")}`,
      "",
      e.notes
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a"); a.href = url; a.download = "journal_" + new Date(e.ts).toISOString().replace(/[:.]/g,"-") + ".txt"; a.click();
    URL.revokeObjectURL(url);
  }

  const score = useMemo(() => Math.round((mood + energy + (11 - stress)) / 3), [mood, energy, stress]);

  return (
    <div className="grid" style={{ display: "grid", gap: 12 }}>
      <div className="card p-3">
        <div className="mb-2" style={{ fontWeight: 600 }}>New Journal Entry</div>
        <div className="mb-2"><label>Mood: {mood}</label><input type="range" min={1} max={10} value={mood} onChange={e=>setMood(Number(e.target.value))} className="input" /></div>
        <div className="mb-2"><label>Energy: {energy}</label><input type="range" min={1} max={10} value={energy} onChange={e=>setEnergy(Number(e.target.value))} className="input" /></div>
        <div className="mb-2"><label>Stress: {stress}</label><input type="range" min={1} max={10} value={stress} onChange={e=>setStress(Number(e.target.value))} className="input" /></div>
        <div className="mb-2"><span className="badge">Score: {score}</span></div>
        <div className="mb-2"><label>Tags (comma separated)</label><input className="input" value={tags} onChange={e=>setTags(e.target.value)} placeholder="sleep, gym, focus" /></div>
        <div className="mb-2"><label>Notes</label><textarea className="input" style={{ minHeight: 100 }} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
        <div><button className="btn" onClick={saveEntry}>Save Entry</button></div>
      </div>

      {showList && (
        <div className="card p-3">
          <div className="mb-2" style={{ fontWeight: 600 }}>Recent Entries</div>
          <div style={{ display: "grid", gap: 8 }}>
            {rows.length === 0 && <div className="badge">No entries yet.</div>}
            {rows.map(e => (
              <div key={e.id} className="card p-2" style={{ background: "#f9fafb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{new Date(e.ts).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Mood {e.mood} · Energy {e.energy} · Stress {e.stress} · Score {Math.round((e.mood + e.energy + (11 - e.stress)) / 3)}
                    </div>
                    {e.tags.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {e.tags.map((t,i)=><span key={i} className="badge">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" onClick={()=>dlTxt(e)}>Download .txt</button>
                    <button className="btn" onClick={()=>del(e.id)}>Delete</button>
                  </div>
                </div>
                {e.notes && <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{e.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
