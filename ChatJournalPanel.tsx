// === FILE: ChatJournalPanel.tsx
// === CONTRACTS ===============================================================
// <ChatJournalPanel mood energy stress tags saveTo onChange />
// - Pure options UI for Journal mode (sliders/tags/save-target)
// - NO text area here; composer in ChatPage is the single notes box

import React from "react";

export type JournalSaveTarget = "local" | "db" | "vector" | "both";

export default function ChatJournalPanel(props: {
  mood: number; energy: number; stress: number; tags: string; saveTo: JournalSaveTarget;
  onChange: (next: Partial<{ mood:number; energy:number; stress:number; tags:string; saveTo:JournalSaveTarget }>) => void;
}) {
  const { mood, energy, stress, tags, saveTo, onChange } = props;

  return (
    <div className="grid" style={{ display:"grid", gap:12 }}>
      {/* >>> BEGIN: Sliders3Up */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(120px, 1fr))", gap:12 }}>
        <div>
          <label>Mood: {mood}</label>
          <input type="range" min={1} max={10} value={mood} onChange={e=>onChange({ mood: Number(e.target.value) })} />
        </div>
        <div>
          <label>Energy: {energy}</label>
          <input type="range" min={1} max={10} value={energy} onChange={e=>onChange({ energy: Number(e.target.value) })} />
        </div>
        <div>
          <label>Stress: {stress}</label>
          <input type="range" min={1} max={10} value={stress} onChange={e=>onChange({ stress: Number(e.target.value) })} />
        </div>
      </div>
      {/* <<< END: Sliders3Up */}

      {/* >>> BEGIN: TagsAndTarget */}
      <div>
        <label>Tags (comma separated)</label>
        <input className="input" value={tags} onChange={e=>onChange({ tags: e.target.value })} placeholder="sleep, gym, focus" />
      </div>

      <div>
        <label>Save to</label>
        <select className="input" value={saveTo} onChange={e=>onChange({ saveTo: e.target.value as JournalSaveTarget })} style={{ width:"auto", minWidth:140 }}>
          <option value="local">Local</option>
          <option value="db">DB</option>
          <option value="vector">Vector</option>
          <option value="both">Both (Local + DB)</option>
        </select>
      </div>
      {/* <<< END: TagsAndTarget */}
    </div>
  );
}
