// === FILE: ChatPage.tsx =====================================================
// Purpose:
// - Chat + Journal UI
// - Streams SSE from /api/chat/stream
// - Detects {"type":"toolcall", ...} lines from the model
//   → opens a review modal (edit args) → POST /api/tools/exec on confirm
// - Filters out LM Studio control JSON frames so the chat bubble shows text only
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Optional helpers; fall back to fetch if missing
import { createTask, createChecklist } from "./api";
import ChatJournalPanel from "./ChatJournalPanel";

// ============================================================================
// Tiny settings helpers (read from localStorage)
// ============================================================================
function __apiBase(): string {
  try {
    const s = JSON.parse(localStorage.getItem("app.settings.v1") || "{}");
    const ep = (s?.aiEndpoint || "").trim();
    return ep ? ep.replace(/\/+$/, "") : "http://127.0.0.1:8001";
  } catch {
    return "http://127.0.0.1:8001";
  }
}
function __lmBase(): string {
  try {
    const s = JSON.parse(localStorage.getItem("app.settings.v1") || "{}");
    const v = (s?.lmBase || "").trim();
    return v ? v.replace(/\/+$/, "") : "http://127.0.0.1:1234";
  } catch {
    return "http://127.0.0.1:1234";
  }
}

// ============================================================================
// Types
// ============================================================================
type Role = "user" | "ai" | "system";
type ChatMsg = { id: string; role: Role; text: string };

type ChatSettings = {
  agent: "Assistant" | "Kraken";
  model: string;
  panel: "Chat" | "Journal";
  ctxTasks: boolean;
  ctxChecklists: boolean;
  ctxJournal: boolean;
};

type TaskRow = { task_id: number; title: string; priority?: number };
type ChecklistRow = { checklist_id?: number; id?: number; name: string; category?: string };

type JournalPrefs = {
  mood: number; energy: number; stress: number; tags: string;
  saveTo: "local" | "db" | "vector" | "both";
};

// Tool preview
type ToolPreview = { name: string; argsText: string } | null;

// ============================================================================
// LocalStorage utils
// ============================================================================
const SETTINGS_KEY = "chat.settings.v1";
const PROMPTS_KEY  = "chat.prompts.v1";
const JOURNAL_KEY  = "chat.journal.prefs.v1";

const uid = () => Math.random().toString(36).slice(2);
const saveJSON = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v));
const loadJSON = <T,>(k: string, def: T): T => {
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : def; }
  catch { return def; }
};

async function fetchJSON(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** Normalize checklist id (works with either `id` or `checklist_id`). */
function getCid(c: ChecklistRow): number | null {
  const a = (c as any)?.checklist_id;
  const b = (c as any)?.id;
  if (typeof a === "number") return a;
  if (typeof b === "number") return b;
  return null;
}

function loadSettings(): ChatSettings {
  return loadJSON<ChatSettings>(SETTINGS_KEY, {
    agent: "Assistant", model: "lmstudio", panel: "Chat",
    ctxTasks: true, ctxChecklists: true, ctxJournal: false
  });
}
function loadJournalPrefs(): JournalPrefs {
  return loadJSON<JournalPrefs>(JOURNAL_KEY, { mood:5, energy:5, stress:5, tags:"", saveTo:"local" });
}

// ============================================================================
// Journal fetch (prev 30d; DB first, silent fallback empty)
// ============================================================================
async function fetchJournalPrevMonth(): Promise<Array<{ ts:string; mood:number; energy:number; stress:number; tags:string }>> {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - 30*24*60*60*1000);
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    // harmless pass-through; server ignores on this route
    q.set("lmBase", __lmBase());
    const apiBase = __apiBase();
    const data = await fetchJSON(`${apiBase}/api/journal/recent?${q.toString()}`);
    return Array.isArray((data as any)?.rows) ? (data as any).rows : [];
  } catch {
    return [];
  }
}

// ============================================================================
// Toolcall helpers
// ============================================================================
/** Try to parse a line that *might* be a toolcall JSON. Returns null if not. */
function parseToolcallLine(raw: string): { name: string; args: any } | null {
  const s = raw.trim();
  if (!s.startsWith("{") || !s.endsWith("}")) return null;
  try {
    const j = JSON.parse(s);
    if (j && j.type === "toolcall" && typeof j.name === "string") {
      return { name: j.name, args: j.args ?? {} };
    }
  } catch { /* ignore */ }
  return null;
}

// ============================================================================
// Component
// ============================================================================
export default function ChatPage() {
  // ----- State --------------------------------------------------------------
  const [log, setLog] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<ChatSettings>(loadSettings());
  const [isStreaming, setStreaming] = useState(false);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [lists, setLists] = useState<ChecklistRow[]>([]);
  const [taskSel, setTaskSel] = useState<Record<number, boolean>>({});
  const [listSel, setListSel] = useState<Record<number, boolean>>({});

  const [prompts, setPrompts] = useState<string[]>(loadJSON<string[]>(PROMPTS_KEY, []));
  const [promptIdx, setPromptIdx] = useState<number>(-1);

  const [jp, setJP] = useState<JournalPrefs>(loadJournalPrefs());

  // Tool preview modal state
  const [toolPreview, setToolPreview] = useState<ToolPreview>(null);
  const [toolBusy, setToolBusy] = useState(false);
  const [pendingToolAiId, setPendingToolAiId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const listRef  = useRef<HTMLDivElement | null>(null);

  // ----- Persistence + scroll ----------------------------------------------
  useEffect(() => { setSettings(loadSettings()); }, []);
  useEffect(() => { saveJSON(SETTINGS_KEY, settings); }, [settings]);
  useEffect(() => { saveJSON(PROMPTS_KEY, prompts); }, [prompts]);
  useEffect(() => { saveJSON(JOURNAL_KEY, jp); }, [jp]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [log]);

  // ----- Fetch task/checklist context when toggles change -------------------
  useEffect(() => {
    (async () => {
      if (settings.ctxTasks) {
        try {
          const r = await fetch(`${__apiBase()}/api/tasks`, { cache:"no-store" });
          const rows: TaskRow[] = r.ok ? await r.json() : [];
          setTasks(Array.isArray(rows) ? rows.slice(0, 20) : []);
        } catch { setTasks([]); }
      } else setTasks([]);

      if (settings.ctxChecklists) {
        try {
          const r = await fetch(`${__apiBase()}/api/checklists`, { cache:"no-store" });
          const rows: ChecklistRow[] = r.ok ? await r.json() : [];
          setLists(Array.isArray(rows) ? rows.slice(0, 12) : []);
        } catch { setLists([]); }
      } else setLists([]);
    })();
  }, [settings.ctxTasks, settings.ctxChecklists]);

  // ----- Context block builder ---------------------------------------------
  async function buildContext(): Promise<string> {
    const blocks: string[] = [];

    if (settings.ctxTasks && tasks.length) {
      const sel = tasks.filter(t => taskSel[t.task_id]);
      const ts = (sel.length ? sel : tasks.slice(0, 6)).map(t => `- [P${t.priority ?? 3}] ${t.title}`).join("\n");
      blocks.push(`Tasks:\n${ts}`);
    }

    if (settings.ctxChecklists && lists.length) {
      const sel = lists.filter(c => {
        const cid = getCid(c);
        return cid != null && listSel[cid];
      });
      const shown = sel.length ? sel : lists.slice(0, 6);
      const cs = shown.map(c => `- ${c.name} (${c.category ?? "general"})`).join("\n");
      blocks.push(`Checklists:\n${cs}`);
    }

    if (settings.ctxJournal) {
      let list: Array<{ ts:number; mood:number; energy:number; stress:number; tags:string[] }> = [];
      try {
        const rows = await fetchJournalPrevMonth();
        if (rows.length) {
          list = rows.map(r => ({
            ts: Date.parse(r.ts),
            mood: Number(r.mood ?? 0),
            energy: Number(r.energy ?? 0),
            stress: Number(r.stress ?? 0),
            tags: String(r.tags ?? "").split(",").map(s=>s.trim()).filter(Boolean),
          }));
        }
      } catch {}
      if (!list.length) {
        try {
          const raw = localStorage.getItem("journal_entries_v1");
          const arr = raw ? (JSON.parse(raw) as any[]) : [];
          const cutoff = Date.now() - 30*24*60*60*1000;
          list = arr
            .filter(e => (e?.ts ?? 0) >= cutoff)
            .map(e => ({
              ts: e.ts,
              mood: e.mood,
              energy: e.energy,
              stress: e.stress,
              tags: Array.isArray(e.tags) ? e.tags : [],
            }));
        } catch {}
      }
      if (list.length) {
        const lines = list
          .sort((a,b)=>b.ts - a.ts)
          .slice(0, 30)
          .map(j => `- ${new Date(j.ts).toLocaleDateString()} mood:${j.mood} energy:${j.energy} stress:${j.stress} ${j.tags.join(",")}`);
        blocks.push(`Journal (prev 30d):\n${lines.join("\n")}`);
      }
    }

    return blocks.join("\n\n");
  }

  // ----- Small handlers -----------------------------------------------------
  function onNewChat(){ setLog([]); setInput(""); }
  function onStop(){ abortRef.current?.abort(); abortRef.current = null; setStreaming(false); }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>){ if (e.key==="Enter" && !e.shiftKey){ e.preventDefault(); void send(); } }

  // ----- Slash commands -----------------------------------------------------
  async function handleSlash(line: string): Promise<boolean> {
    if (settings.panel === "Journal") return false;
    const t = line.trim(); if (!t.startsWith("/")) return false;
    const [cmd, ...rest] = t.split(" "); const arg = rest.join(" ").trim();

    if (cmd === "/task") {
      const title = arg || prompt("Task title?") || ""; if (!title) return true;
      try {
        if (typeof createTask==="function") await createTask({ title, description:"", priority:1, xp:0, coins:0 } as any);
        else await fetch(`${__apiBase()}/api/tasks`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ title, description:"" }) });
        setLog(l=>[...l,{ id:uid(), role:"system", text:`Created task: ${title}` }]);
      } catch(e:any){
        setLog(l=>[...l,{ id:uid(), role:"system", text:`Failed to create task: ${e?.message??e}` }]);
      }
      return true;
    }

    if (cmd === "/checklist") {
      const name = arg || prompt("Checklist name?") || ""; if (!name) return true;
      try {
        if (typeof createChecklist==="function") await createChecklist({ name, category:"general" });
        else await fetch(`${__apiBase()}/api/checklists`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name, category:"general" }) });
        setLog(l=>[...l,{ id:uid(), role:"system", text:`Created checklist: ${name}` }]);
      } catch(e:any){
        setLog(l=>[...l,{ id:uid(), role:"system", text:`Failed to create checklist: ${e?.message??e}` }]);
      }
      return true;
    }

    setLog(l=>[...l,{ id:uid(), role:"system", text:`Unknown command: ${cmd}` }]); 
    return true;
  }

  // ----- Journal saving -----------------------------------------------------
  async function saveJournalViaLocal(notes: string){
    const entry = {
      id: uid(), ts: Date.now(),
      mood: jp.mood, energy: jp.energy, stress: jp.stress,
      tags: jp.tags.split(",").map(s=>s.trim()).filter(Boolean),
      notes: notes.trim()
    };
    const raw = localStorage.getItem("journal_entries_v1");
    const arr = raw ? (JSON.parse(raw) as any[]) : [];
    localStorage.setItem("journal_entries_v1", JSON.stringify([entry, ...arr]));
    return entry.id;
  }
  async function saveJournalViaDB(notes: string){
    const res = await fetch(`${__apiBase()}/api/journal`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        ts: new Date().toISOString(),
        text: notes.trim(),
        mood: jp.mood, energy: jp.energy, stress: jp.stress,
        tags: jp.tags
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json(); // { ok:true, id }
    return data?.id ?? null;
  }
  async function saveJournalViaVector(notes: string){
    try {
      const mod = await import("./journalVector");
      const id = await mod.save({
        ts: Date.now(),
        text: notes.trim(),
        mood: jp.mood, energy: jp.energy, stress: jp.stress,
        tags: jp.tags
      });
      return id ?? null;
    } catch {
      return "vec_" + uid();
    }
  }
  async function saveJournal(notes: string){
    const ids: string[] = [];
    if (jp.saveTo === "local") {
      ids.push(await saveJournalViaLocal(notes));
    } else if (jp.saveTo === "db") {
      ids.push(String(await saveJournalViaDB(notes)));
    } else if (jp.saveTo === "vector") {
      ids.push(String(await saveJournalViaVector(notes)));
    } else {
      const a = await saveJournalViaLocal(notes);
      const b = String(await saveJournalViaDB(notes));
      ids.push(a, b);
    }
    setLog(l => [...l, {
      id: uid(),
      role: "system",
      text: `JOURNAL saved (${jp.saveTo})   mood ${jp.mood}   energy ${jp.energy}   stress ${jp.stress}   tags: ${jp.tags || "—"}`
    }]);
    return ids;
  }

  // ========================================================================
  // SEND (Chat flow with SSE + toolcall preview)
  // ========================================================================
  async function send(){
    const text = input.trim(); if (!text || isStreaming) return;

    // Journal mode
    if (settings.panel === "Journal") {
      await saveJournal(text);
      setInput("");
      return;
    }

    // Chat mode
    if (await handleSlash(text)) { setInput(""); return; }

    const aiId = uid();
    setLog(l=>[...l, { id:uid(), role:"user", text }, { id:aiId, role:"ai", text:"" }]);
    setInput("");

    let contextBlock = ""; try { contextBlock = await buildContext(); } catch {}

    const apiBase = __apiBase();
    try {
      setStreaming(true);
      const q = new URLSearchParams({ message:text, agent:settings.agent, model:settings.model, context:contextBlock });
      q.set("lmBase", __lmBase());

      const ctrl = new AbortController(); abortRef.current = ctrl;
      const res = await fetch(`${apiBase}/api/chat/stream?${q.toString()}`, { signal: ctrl.signal });

      if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);

      const rdr = res.body.getReader(); const dec = new TextDecoder();
      let done = false, buf = "";
      while (!done) {
        const { value, done:d } = await rdr.read(); done = d;
        if (!value) continue;

        buf += dec.decode(value, { stream: !done });
        const parts = buf.split(/\r?\n/); buf = parts.pop() || "";
        for (const line of parts) {
          const payload = line.replace(/^data:\s?/, "").trim();
          if (!payload) continue;
          if (payload === "[[END]]") { done = true; break; }

          // 1) Toolcall JSON? → open preview modal
          const tc = parseToolcallLine(payload);
          if (tc) {
            setToolPreview({ name: tc.name, argsText: JSON.stringify(tc.args ?? {}, null, 2) });
            setPendingToolAiId(aiId);
            setLog(l => [...l, { id: uid(), role: "system", text: `⏳ Tool requested: ${tc.name}` }]);
            continue;
          }

          // 2) Any other JSON-looking chunk (LM Studio control frames) → ignore
          if ((payload.startsWith("{") && payload.endsWith("}")) || (payload.startsWith("[") && payload.endsWith("]"))) {
            if (payload.includes("[ERROR]")) {
              setLog(l => [...l, { id: uid(), role: "system", text: payload }]);
            }
            continue;
          }

          // 3) Normal token (plain text) → append to current AI message
         setLog(l => l.map(m => {
  if (m.id !== aiId) return m;

  const prev = m.text;
  const next = payload;

  // If chunk already starts with whitespace or previous ends with whitespace, don't add anything.
  if (!prev || /^\s/.test(next) || /\s$/.test(prev)) {
    return { ...m, text: prev + next };
  }

  const last = prev.slice(-1);
  const first = next.charAt(0);
  const isAN = (c: string) => /[A-Za-z0-9]/.test(c);

  // Add space when:
  // 1) Word-to-word joins (…letter][letter…)
  // 2) After sentence/phrase punctuation .?!,:; when the next chunk begins a word or an opening quote/backtick
  // 3) After closing brackets/quotes when the next chunk begins a word
  const needsSpace =
    (isAN(last) && isAN(first)) ||
    ((/[.?!,:;]$/.test(prev)) && (isAN(first) || /^["'`]/.test(first))) ||
    ((/[)\]}”’"]$/.test(last)) && isAN(first));

  return { ...m, text: prev + (needsSpace ? " " : "") + next };
}));


        }
      }
    } catch {
      // Fallback: non-stream
      try {
        const res = await fetch(`${apiBase}/api/chat`, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ message: text, agent: settings.agent, model: settings.model, context: contextBlock, lmBase: __lmBase() })
        });
        const data = await res.json().catch(()=> ({} as any));
        setLog(l=>l.map(m=>m.id===aiId ? { ...m, text: (data as any)?.reply ?? "(no reply)" } : m));
      } catch(e:any){
        setLog(l=>l.map(m=>m.id===aiId ? { ...m, text:`Error: ${e?.message ?? e}` } : m));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  // ========================================================================
  // Tool preview actions
  // ========================================================================
  async function confirmTool() {
    if (!toolPreview) return;
    setToolBusy(true);
    const apiBase = __apiBase();

    let args: any = {};
    try { args = JSON.parse(toolPreview.argsText || "{}"); }
    catch (e:any) {
      alert("Args are not valid JSON: " + (e?.message ?? e));
      setToolBusy(false);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/tools/exec`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ name: toolPreview.name, args })
      });
      const data = await res.json().catch(()=> ({}));
      const ok = !!(data && data.ok !== false);
      const info = ok ? JSON.stringify(data.result ?? null) : String(data.error ?? "error");
      setLog(l => [...l, { id: uid(), role:"system", text: `${ok ? "✅" : "❌"} ${toolPreview.name}: ${info}` }]);
    } catch(e:any) {
      setLog(l => [...l, { id: uid(), role:"system", text: `❌ ${toolPreview.name}: ${e?.message ?? e}` }]);
    } finally {
      setToolBusy(false);
      setToolPreview(null);
      setPendingToolAiId(null);
    }
  }
  function cancelTool() {
    setToolPreview(null);
    setPendingToolAiId(null);
  }

  // ========================================================================
  // UI Fragments
  // ========================================================================
  const header = (
    <div className="card p-3 mb-3">
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <strong>Chat</strong>
        <select className="input" title="Agent"  style={{ width:"auto", minWidth:140 }} value={settings.agent}
          onChange={e=>setSettings({ ...settings, agent: e.target.value as ChatSettings["agent"] })}>
          <option>Assistant</option><option>Kraken</option>
        </select>
        <select className="input" title="Model"  style={{ width:"auto", minWidth:140 }} value={settings.model}
          onChange={e=>setSettings({ ...settings, model: e.target.value })}>
          <option value="lmstudio">lmstudio</option>
          <option value="default">default</option>
          <option value="gpt-local">gpt-local</option>
        </select>
        <select className="input" title="Panel"  style={{ width:"auto", minWidth:140 }} value={settings.panel}
          onChange={e=>setSettings({ ...settings, panel: e.target.value as ChatSettings["panel"] })}>
          <option value="Chat">Chat</option><option value="Journal">Journal</option>
        </select>
        <button className="btn" style={{ whiteSpace:"nowrap" }} onClick={onNewChat}>New Chat</button>
        {isStreaming ? <button className="btn" style={{ whiteSpace:"nowrap" }} onClick={onStop}>Stop</button> : null}

        {settings.panel === "Chat" && (
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <select className="input" style={{ width:"auto", minWidth:180 }} value={promptIdx}
              onChange={e => { const idx = Number(e.target.value); setPromptIdx(idx); if (idx>=0 && prompts[idx]) setInput(prompts[idx]); }}>
              <option value={-1}>Saved prompts…</option>
              {prompts.map((p,i)=> <option key={`p-${i}-${p.length}`} value={i}>{p.slice(0,42)}{p.length>42?"…":""}</option>)}
            </select>
            <button className="btn" style={{ whiteSpace:"nowrap" }}
              onClick={() => { if (!input.trim()) return; setPrompts(arr => [...arr, input.trim()]); setPromptIdx(prompts.length); }}>
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const stream = (
    <div ref={listRef} className="card p-3" style={{ height: 420, overflowY:"auto" }}>
      {log.length === 0 && <div className="badge">No messages yet.</div>}
      {log.map(m => (
        <div key={m.id} className="mb-3">
          <div style={{ fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color: m.role==="user" ? "#2563eb" : m.role==="ai" ? "#059669" : "#6b7280" }}>{m.role.toUpperCase()}</span>
            {m.text.startsWith("JOURNAL saved") && <span className="badge">JOURNAL</span>}
          </div>
          <div style={{ whiteSpace:"pre-wrap" }}>{m.text}</div>
          {m.role==="ai" && settings.panel==="Chat" && (
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              <button className="btn" onClick={()=>{/* placeholder actions */}}>Create Task</button>
              <button className="btn" onClick={()=>{/* placeholder actions */}}>Add to Checklist</button>
              <button className="btn" onClick={()=>{/* placeholder actions */}}>Grant Renown</button>
              <button className="btn" onClick={()=>{/* placeholder actions */}}>Print Snippet</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const chips = (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:6 }}>
      {settings.panel === "Chat" && [
        "Plan my day from tasks + checklists",
        "Summarize the last 3 journal entries and propose 2 goals",
        "Draft a checklist for tonight based on open tasks",
        "Turn these tasks into a 3-step quest"
      ].map((t,i)=>(
        <button key={`chip-${i}`} className="badge" onClick={() => setInput(prev => prev ? (prev + (prev.endsWith("\n") ? "" : "\n") + t) : t)}>
          {t}
        </button>
      ))}
    </div>
  );

  const composer = (
    <div className="card p-2" style={{ display:"flex", gap:8, alignItems:"center" }}>
      <div style={{ flex:1 }}>
        {chips}
        <textarea
          className="input"
          style={{ width:"100%", minHeight:60, resize:"vertical" }}
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={settings.panel==="Chat"
            ? "Type a message...  (Enter = send, Shift+Enter = newline)  Try /task Plan today"
            : "Write your journal entry here… (Enter = save, Shift+Enter = newline)"}
        />
      </div>
      <button className="btn" onClick={send} disabled={isStreaming}>
        {settings.panel==="Chat" ? "Send" : `Save Journal${jp.saveTo==="local" ? "" : ` → ${jp.saveTo}`}`}
      </button>
    </div>
  );

  const rightRail = settings.panel === "Chat" ? (
    <div className="card p-3" style={{ minWidth:360 }}>
      <div className="mb-2"><strong>Context</strong></div>
      <label style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input type="checkbox" checked={settings.ctxTasks} onChange={e=>setSettings({ ...settings, ctxTasks: e.target.checked })} /> Include Tasks
      </label>
      <label style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input type="checkbox" checked={settings.ctxChecklists} onChange={e=>setSettings({ ...settings, ctxChecklists: e.target.checked })} /> Include Checklists
      </label>
      <label style={{ display:"flex", gap:8, alignItems:"center" }}>
        <input type="checkbox" checked={settings.ctxJournal} onChange={e=>setSettings({ ...settings, ctxJournal: e.target.checked })} /> Include Journal
      </label>

      {(settings.ctxTasks || settings.ctxChecklists) && (
        <div className="mt-3">
          <div className="mb-1" style={{ fontWeight:600 }}>Context Checklist</div>
          {settings.ctxTasks && (
            <div className="mb-2">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Tasks</div>
              <div style={{ maxHeight:120, overflowY:"auto" }}>
                {tasks.map(t=>(
                  <label key={`task-${String(t.task_id)}`} style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input type="checkbox" checked={!!taskSel[t.task_id]} onChange={e=>setTaskSel(s=>({ ...s, [t.task_id]: e.target.checked }))} />
                    <span title={t.title}>[P{t.priority ?? 3}] {t.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {settings.ctxChecklists && (
            <div className="mb-2">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Checklists</div>
              <div style={{ maxHeight:120, overflowY:"auto" }}>
                {lists.map((c) => {
                  const cid = getCid(c);
                  if (cid == null) return null;
                  return (
                    <label key={`list-${cid}`} style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <input
                        type="checkbox"
                        checked={!!listSel[cid]}
                        onChange={e => setListSel(s => ({ ...s, [cid]: e.target.checked }))}
                      />
                      <span title={c.name}>{c.name} ({c.category ?? "general"})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <button className="btn" onClick={()=>{
            const tsel = tasks.filter(t=>taskSel[t.task_id]).map(t=>`- [P${t.priority ?? 3}] ${t.title}`).join("\n");
            const lsel = lists
              .filter(c => { const cid = getCid(c); return cid != null && listSel[cid]; })
              .map(c=>`- ${c.name} (${c.category ?? "general"})`).join("\n");
            const blocks: string[] = []; if (tsel) blocks.push(`Tasks:\n${tsel}`); if (lsel) blocks.push(`Checklists:\n${lsel}`);
            const addition = blocks.join("\n\n"); if (addition) setInput(prev => (prev ? (prev + "\n\n" + addition) : addition));
          }}>Insert selected</button>
        </div>
      )}

      <div className="mt-3" style={{ fontSize:12, color:"#6b7280" }}>
        Tips: <code>/task</code>, <code>/checklist</code>.
      </div>
    </div>
  ) : (
    <div className="card p-3" style={{ minWidth:360 }}>
      <div className="mb-2"><strong>Journal</strong></div>
      <ChatJournalPanel
        mood={jp.mood} energy={jp.energy} stress={jp.stress} tags={jp.tags} saveTo={jp.saveTo}
        onChange={(next)=> setJP(prev => ({ ...prev, ...next }))}
      />
    </div>
  );

  // ----- Page layout --------------------------------------------------------
  const body = (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:16 }}>
      <div style={{ display:"grid", gridTemplateRows:"1fr auto", gap:12 }}>
        {stream}
        {composer}
      </div>
      {rightRail}
    </div>
  );

  // ----- Render -------------------------------------------------------------
  return (
    <div className="p-4 max-w-6xl mx-auto">
      {header}
      {body}

      {/* ==== Tool Preview Modal ==== */}
      {toolPreview && (
        <div
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
            display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999
          }}
          onClick={(e)=>{ if (e.target===e.currentTarget && !toolBusy) cancelTool(); }}
        >
          <div className="card p-3" style={{ width:520, maxWidth:"90vw" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <strong>Review tool call</strong>
              <span className="badge">{toolPreview.name}</span>
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>
              The model requested to run <code>{toolPreview.name}</code>. Review and edit the arguments below, then Confirm or Cancel.
            </div>
            <textarea
              className="input"
              style={{ width:"100%", height:180, fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace" }}
              value={toolPreview.argsText}
              onChange={e => setToolPreview(tp => tp ? { ...tp, argsText: e.target.value } : tp)}
              disabled={toolBusy}
            />
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:10 }}>
              <button className="btn" onClick={cancelTool} disabled={toolBusy}>Cancel</button>
              <button className="btn" onClick={confirmTool} disabled={toolBusy}>{toolBusy ? "Running…" : "Confirm & Run"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === EOF ====================================================================
