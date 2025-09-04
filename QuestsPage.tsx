import React, { useEffect, useMemo, useState } from "react";
import { fetchQuests, createQuest, fetchQuestSteps, addQuestStep, linkStepTask, setStepStatus } from "./api";
import { fetchTasks, type TaskRow } from "./api";

type Quest = Awaited<ReturnType<typeof fetchQuests>>[number];
type QuestStep = Awaited<ReturnType<typeof fetchQuestSteps>>[number];

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [status, setStatus] = useState("");

  const [title, setTitle] = useState("");         // new quest
  const [summary, setSummary] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setStatus("Loading");
        const [qs, ts] = await Promise.all([fetchQuests(), fetchTasks({ sort: "title" })]);
        setQuests(qs);
        setTasks(ts);
        setStatus("Ready");
      } catch (e:any) { setStatus(e?.message || "Failed to load"); }
    })();
  }, []);

  async function onCreateQuest(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!title.trim()) { setStatus("Title required"); return; }
      const r = await createQuest({ title: title.trim(), summary: summary.trim() || null });
      setTitle(""); setSummary("");
      const qs = await fetchQuests(); setQuests(qs);
      setExpanded(prev => ({ ...prev, [r.id]: true }));
      setStatus("Quest created");
    } catch (e:any) { setStatus(e?.message || "Failed to create quest"); }
  }

  async function onAddStep(questId:number, form: HTMLFormElement) {
    const fd = new FormData(form);
    const stitle = String(fd.get("stitle")||"").trim();
    const sdesc  = String(fd.get("sdesc")||"").trim() || null;
    const taskId = Number(fd.get("task_id") || "");
    if (!stitle) { setStatus("Step title required"); return; }
    await addQuestStep(questId, { title: stitle, description: sdesc, task_id: Number.isFinite(taskId) ? taskId : undefined });
    const steps = await fetchQuestSteps(questId);
    setQuests(qs => qs.map(q => q.id === questId ? { ...q } : q)); // no-op to trigger rerender
    (document.getElementById(`step-form-${questId}`) as HTMLFormElement)?.reset();
    (window as any).__steps ??= {};
    (window as any).__steps[questId] = steps;
    setStatus("Step added");
  }

  async function ensureStepsLoaded(questId:number) {
    (window as any).__steps ??= {};
    if (!(window as any).__steps[questId]) {
      (window as any).__steps[questId] = await fetchQuestSteps(questId);
      setStatus("Steps loaded");
    }
  }

  async function markDone(questId:number, step:QuestStep) {
    await setStepStatus(questId, step.id, step.status === "done" ? "open" : "done");
    (window as any).__steps[questId] = await fetchQuestSteps(questId);
    const qs = await fetchQuests(); setQuests(qs);
  }

  async function relink(questId:number, stepId:number, taskId:number) {
    await linkStepTask(questId, stepId, taskId);
    (window as any).__steps[questId] = await fetchQuestSteps(questId);
    setStatus("Linked");
  }

  const data = useMemo(() => quests, [quests]);

  return (
    <div className="container main">
      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <h3 style={{ margin:0 }}>Quests</h3>
          <span className="badge">{status}</span>
        </div>

        {/* New quest form */}
        <form onSubmit={onCreateQuest} className="toolbar" style={{ gap:8, marginTop:12, flexWrap:"wrap" }}>
          <input className="input" placeholder="Quest title" value={title} onChange={e=>setTitle(e.target.value)} style={{ minWidth:240 }} />
          <input className="input" placeholder="Summary (optional)" value={summary} onChange={e=>setSummary(e.target.value)} style={{ minWidth:340 }} />
          <button className="btn primary" type="submit">Create</button>
          <button className="btn" type="button" onClick={()=>{ setTitle(""); setSummary(""); setStatus(""); }}>Clear</button>
        </form>
      </div>

      <div style={{ height:12 }} />

      {/* Quests list as cards */}
      <div className="grid cols-2">
        {data.map(q => (
          <div key={q.id} className="card" style={{ display:"grid", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:600 }}>{q.title}</div>
                {q.summary && <div className="muted" style={{ fontSize:13 }}>{q.summary}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div className="badge">{q.status}</div>
                <div className="muted" style={{ fontSize:12 }}>{q.done_steps}/{q.total_steps} • {q.percent}%</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:8, background:"#f3f4f6", borderRadius:6, overflow:"hidden", border:"1px solid #e5e7eb" }}>
              <div style={{ height:"100%", width:`${q.percent}%`, background:"#10b981" }} />
            </div>

            {/* Expand/collapse */}
            <div>
              <button
                className="btn"
                onClick={async ()=>{ setExpanded(e=>({ ...e, [q.id]: !e[q.id] })); await ensureStepsLoaded(q.id); }}>
                {expanded[q.id] ? "Hide steps" : "Show steps"}
              </button>
            </div>

            {/* Steps */}
            {expanded[q.id] && (
              <div style={{ display:"grid", gap:8 }}>
                <Steps questId={q.id} onMark={markDone} onRelink={relink} tasks={tasks} />
                {/* Add step */}
                <form id={`step-form-${q.id}`} onSubmit={(e)=>{ e.preventDefault(); onAddStep(q.id, e.currentTarget); }} className="toolbar" style={{ gap:8, flexWrap:"wrap" }}>
                  <input name="stitle" className="input" placeholder="Step title" style={{ minWidth:220 }} />
                  <input name="sdesc" className="input" placeholder="Step description (optional)" style={{ minWidth:260 }} />
                  <select name="task_id" className="select" defaultValue="" style={{ width:220 }}>
                    <option value="">(link to task… optional)</option>
                    {tasks.map(t => <option key={t.task_id} value={t.task_id}>{t.title}</option>)}
                  </select>
                  <button className="btn primary" type="submit">Add Step</button>
                </form>
              </div>
            )}
          </div>
        ))}
        {data.length === 0 && <div className="card"><span className="empty">No quests yet</span></div>}
      </div>
    </div>
  );
}

function Steps({ questId, onMark, onRelink, tasks }:{ questId:number; onMark:(qid:number, s:any)=>any; onRelink:(qid:number,sid:number,tid:number)=>any; tasks:TaskRow[] }) {
  const [steps, setSteps] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      (window as any).__steps ??= {};
      if ((window as any).__steps[questId]) { setSteps((window as any).__steps[questId]); }
      else { const s = await fetchQuestSteps(questId); (window as any).__steps[questId] = s; setSteps(s); }
    })();
  }, [questId]);

  useEffect(() => {
    const s = (window as any).__steps?.[questId]; if (s) setSteps(s);
  });

  return (
    <div className="grid cols-1" style={{ gap:8 }}>
      {steps.length === 0 ? <span className="empty">No steps yet</span> : steps.map(s => (
        <div key={s.id} className="card" style={{ padding:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <div style={{ fontWeight:600 }}>{s.title}</div>
            <div className="muted" style={{ fontSize:12 }}>{s.status}</div>
          </div>
          {s.description && <div className="muted" style={{ marginTop:4, fontSize:13 }}>{s.description}</div>}

          <div className="toolbar" style={{ gap:8, marginTop:8, flexWrap:"wrap" }}>
            <button className="btn" onClick={()=>onMark(questId, s)}>{s.status === "done" ? "Mark Open" : "Mark Done"}</button>

            <select defaultValue={s.task_id || ""} onChange={(e)=>onRelink(questId, s.id, Number(e.target.value))} className="select" style={{ width:220 }}>
              <option value="">(link to task)</option>
              {tasks.map(t => <option key={t.task_id} value={t.task_id}>{t.title}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
