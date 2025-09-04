import React, { useEffect, useMemo, useState } from "react";
import { fetchTasks, createTask, type TaskRow, fetchTaskCategories, type TaskCategory } from "./api";

export default function TasksPage() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<number>(3);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"created_at" | "priority" | "title">("created_at");

  // category state
  const [cats, setCats] = useState<TaskCategory[]>([]);
  const [catFilter, setCatFilter] = useState<number | "all">("all");
  const [catCreate, setCatCreate] = useState<number | null>(null);

  async function load() {
    const list = await fetchTasks({
      q,
      priority: undefined,
      sort,
      category_id: (catFilter === "all" ? undefined : catFilter)
    });
    setRows(list);
  }
  async function loadCats() {
    const cs = await fetchTaskCategories();
    setCats(cs);
  }

  useEffect(() => { loadCats().catch(console.error); }, []);
  useEffect(() => { load().catch(console.error); }, [q, sort, catFilter]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!title.trim()) { setStatus("Title is required"); return; }
      await createTask({
        title: title.trim(),
        description: description || null,
        priority,
        xp: 10,
        coins: 0,
        category_id: catCreate
      });
      setTitle(""); setDescription(""); setPriority(3); setCatCreate(null);
      setStatus("Task created");
      await load();
    } catch (e: any) {
      setStatus(e?.message || "Failed to create task");
    }
  }

  const recent = useMemo(() => rows.slice(0, 50), [rows]);

  return (
    <div className="container main">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Tasks</h3>
          <div style={{ marginLeft: "auto" }}>
            <span className="badge">{status}</span>
          </div>
        </div>

        {/* Add form */}
        <form onSubmit={onAdd} className="toolbar" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <input className="input" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} style={{ minWidth: 220 }} />
          <input className="input" placeholder="Description (optional)" value={description} onChange={(e)=>setDescription(e.target.value)} style={{ minWidth: 260 }} />
          <div className="toolbar" style={{ gap: 6 }}>
            <label className="muted">Category</label>
            <select className="select" value={catCreate ?? ""} onChange={(e)=>setCatCreate(e.target.value ? Number(e.target.value) : null)} style={{ width: 180 }}>
              <option value="">Uncategorized</option>
              {cats.map(c=> <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </div>
          <div className="toolbar" style={{ gap: 6 }}>
            <label className="muted">Priority</label>
            <input className="input" type="range" min={1} max={5} step={1} value={priority} onChange={(e)=>setPriority(Number(e.target.value))} style={{ width: 120 }} />
            <span className="chip">{priority}</span>
          </div>
          <div className="toolbar" style={{ gap: 6 }}>
            <label className="muted">XP</label>
            <input className="input" type="range" min={0} max={100} step={5} value={10} readOnly style={{ width: 120 }} />
          </div>
          <div className="toolbar" style={{ gap: 6 }}>
            <label className="muted">Coins</label>
            <input className="input" type="range" min={0} max={10} step={1} value={0} readOnly style={{ width: 120 }} />
          </div>
          <button className="btn primary" type="submit">Add</button>
          <button className="btn" type="button" onClick={()=>{ setTitle(""); setDescription(""); setPriority(3); setCatCreate(null); setStatus(""); }}>Clear</button>
        </form>

        {/* Filters */}
        <div className="toolbar" style={{ marginTop: 12 }}>
          <input className="input" placeholder="Search " value={q} onChange={(e)=>setQ(e.target.value)} style={{ minWidth: 240 }} />
          <select className="select" value={sort} onChange={(e)=>setSort(e.target.value as any)} style={{ width: 180 }}>
            <option value="created_at">Sort: Newest</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
          <select className="select" value={catFilter} onChange={(e)=> setCatFilter(e.target.value==="all" ? "all" : Number(e.target.value))} style={{ width: 180 }}>
            <option value="all">All categories</option>
            {cats.map(c=> <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            <option value="">Uncategorized</option>
          </select>
          <button className="btn" onClick={()=>{ setQ(""); setSort("created_at"); setCatFilter("all"); }}>Clear</button>
        </div>

        {/* List */}
        <div style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Title</th>
                <th>Description</th>
                <th style={{ width: 120 }}>Category</th>
                <th style={{ width: 80, textAlign: "center" }}>Priority</th>
                <th style={{ width: 160 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={6}><span className="empty">No matching tasks</span></td></tr>
              ) : recent.map((t) => {
                const cat = cats.find(c=>c.category_id === (t.category_id ?? -1));
                return (
                  <tr key={t.task_id}>
                    <td className="muted">{t.task_id}</td>
                    <td>{t.title}</td>
                    <td>{t.description ? t.description : <span className="muted"> </span>}</td>
                    <td>{cat ? <span className="chip" style={{ borderColor: cat.color, color: cat.color, background:"#fff" }}>{cat.name}</span> : <span className="muted">—</span>}</td>
                    <td style={{ textAlign: "center" }}>{t.priority}</td>
                    <td>{t.created_at ? new Date(t.created_at).toLocaleString() : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
