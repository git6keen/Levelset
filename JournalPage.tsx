import React, { useEffect, useMemo, useState } from "react";

type JournalEntry = {
  id: string;   // sortable id
  ts: number;   // epoch ms
  mood: number; // 1-10
  energy: number; // 1-10
  stress: number; // 1-10
  tags?: string[];
  notes?: string;
};

const STORAGE_KEY = "journal_entries_v1";

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function makeId() {
  const d = new Date();
  const pad = (n:number)=> String(n).padStart(2,"0");
  return [
    d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate()),
    pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())
  ].join("") + "-" + Math.random().toString(36).slice(2,8);
}

export default function JournalPage() {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  useEffect(() => { setEntries(loadEntries()); }, []);

  const score = useMemo(() => Math.round((mood + energy + (11 - stress)) / 3), [mood, energy, stress]);

  function handleSave() {
    const entry: JournalEntry = {
      id: makeId(),
      ts: Date.now(),
      mood, energy, stress,
      tags: tags.trim() ? tags.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
      notes: notes?.trim() || undefined,
    };
    const next = [entry, ...entries].sort((a,b)=> b.ts - a.ts);
    setEntries(next);
    saveEntries(next);
    setNotes(""); // keep sliders/tags as-is for quick logging
  }

  function handleDelete(id: string) {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(next);
  }

  function downloadTxt(e: JournalEntry) {
    const dt = new Date(e.ts);
    const fmt = dt.toISOString().replace(/[:T]/g, "-").slice(0,19);
    const lines = [
      `Date: ${dt.toLocaleString()}`,
      `Mood: ${e.mood}`,
      `Energy: ${e.energy}`,
      `Stress: ${e.stress}`,
      `Score: ${Math.round((e.mood + e.energy + (11 - e.stress)) / 3)}`,
      `Tags: ${(e.tags && e.tags.join(", ")) || ""}`,
      "",
      (e.notes || "").trim(),
      "",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `journal_${fmt}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
  }

  return (
    <div className="container main">
      <div className="card">
        <h3 style={{marginTop:0}}>Journal</h3>

        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(3, 1fr)" }}>
          <Slider label="Mood" value={mood} setValue={setMood} />
          <Slider label="Energy" value={energy} setValue={setEnergy} />
          <Slider label="Stress" value={stress} setValue={setStress} />
        </div>

        <div style={{ marginTop: 8, display:"flex", alignItems:"center", gap: 10 }}>
          <strong>Score:</strong>
          <span className="badge">{score}/10</span>
          <span style={{opacity:.6, fontSize:12}}>(avg of mood, energy, inverted stress)</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 600 }}>Tags (comma-separated)</label>
          <input className="input" value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="workout, fasting, social, focus" />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 600 }}>Notes</label>
          <textarea className="textarea" rows={6} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Quick thoughts..." />
        </div>

        <div style={{ marginTop: 12, display:"flex", justifyContent:"flex-end" }}>
          <button className="btn primary" onClick={handleSave}>Save Entry</button>
        </div>
      </div>

      <h3 style={{margin:"8px 0"}}>Recent Entries</h3>
      <div style={{ display:"grid", gap:10 }}>
        {entries.length === 0 && (
          <div className="badge">No entries yet. Save your first one above.</div>
        )}
        {entries.map(e => (
          <div key={e.id} className="card" style={{ padding:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <strong>{new Date(e.ts).toLocaleString()}</strong>
                <span className="badge">Mood {e.mood}</span>
                <span className="badge">Energy {e.energy}</span>
                <span className="badge">Stress {e.stress}</span>
                <span className="badge">Score {Math.round((e.mood + e.energy + (11 - e.stress)) / 3)}</span>
                {e.tags && e.tags.length > 0 && <span className="badge">{e.tags.join(", ")}</span>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn" onClick={()=>downloadTxt(e)}>Download .txt</button>
                <button className="btn" onClick={()=>handleDelete(e.id)}>Delete</button>
              </div>
            </div>
            {e.notes && <div style={{ marginTop:8, whiteSpace:"pre-wrap" }}>{e.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, setValue }:{ label:string; value:number; setValue:(n:number)=>void }) {
  return (
    <div>
      <label style={{ fontWeight: 600 }}>{label}: <span style={{opacity:.7}}>{value}</span></label>
      <input type="range" min={1} max={10} value={value} onChange={(e)=>setValue(Number(e.target.value))} style={{ width:"100%" }} />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, opacity:.65 }}>
        <span>1</span><span>10</span>
      </div>
    </div>
  );
}
