/** api.ts — client for the local backend (Proto3, full file) */

/////////////////////////////
// Settings (localStorage) //
/////////////////////////////
const S_KEY = "app.settings.v1";
function S(){ try { return JSON.parse(localStorage.getItem(S_KEY)||"{}"); } catch { return {}; } }
const BASE = (String((S() as any).aiEndpoint || "http://127.0.0.1:8001")).replace(/\/+$/, "");

//////////////////////////
// tiny fetch helper(s) //
//////////////////////////
async function req<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, opts);
  if (!r.ok) throw new Error(await r.text());
  const ct = r.headers.get("content-type") || "";
  return (ct.includes("application/json") ? (await r.json()) : (await r.text())) as T;
}

////////////////////
// ---- TASKS ---- //
////////////////////
export type TaskRow = {
  task_id: number;
  title: string;
  description?: string | null;
  priority: number;
  xp: number;
  coins: number;
  created_at?: string | null;
};

export type TaskQuery = {
  q?: string;
  priority?: number;
  sort?: "priority" | "title" | "created_at";
};

export async function fetchTasks(params: TaskQuery = {}): Promise<TaskRow[]> {
  const url = new URL(BASE + "/api/tasks");
  if (params.q) url.searchParams.set("q", params.q);
  if (params.priority != null) url.searchParams.set("priority", String(params.priority));
  if (params.sort) { url.searchParams.set("sort", params.sort); } else { const s:any = S(); if (s.taskDefaultSort) url.searchParams.set("sort", s.taskDefaultSort); }
  return await req<TaskRow[]>(url.pathname + url.search);
}

export async function createTask(input: {
  title: string;
  description?: string | null;
  priority: number;
  xp?: number;
  coins?: number;
}): Promise<void> {
  const s:any = S();
  const payload = {
    title: input.title,
    description: input.description ?? null,
    priority: (input.priority ?? s.taskDefaultPriority ?? 1),
    xp: (input.xp ?? s.taskDefaultXp ?? 0),
    coins: (input.coins ?? s.taskDefaultCoins ?? 0),
  };
  await req("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: number, fields: Partial<{
  title: string;
  description: string | null;
  priority: number;
  xp: number;
  coins: number;
}>): Promise<void> {
  await req(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields || {}),
  });
}

export async function deleteTask(id: number): Promise<void> {
  await req(`/api/tasks/${id}`, { method: "DELETE" });
}

/* Complete a task (server creates completion + soft-closes task in Proto3) */
export async function completeTask(
  id: number,
  note?: string | null
): Promise<{ ok: boolean; completion_id: number; earned_id?: number }> {
  return await req<{ ok: boolean; completion_id: number; earned_id?: number }>(
    `/api/tasks/${id}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note ?? null }),
    }
  );
}

//////////////////////////
// ---- CHECKLISTS ---- //
//////////////////////////
export type ChecklistRow = {
  id: number;
  name: string;
  category?: string | null;
  created_at?: string | null;
  items?: number;
};

export type ChecklistItemRow = {
  id: number;
  checklist_id: number;
  text: string;
  done: 0 | 1;
  position?: number;
};

export async function fetchChecklists(params: {
  q?: string;
  category?: string;
  sort?: "name" | "created_at";
} = {}): Promise<ChecklistRow[]> {
  const url = new URL(BASE + "/api/checklists");
  if (params.q) url.searchParams.set("q", params.q);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.sort) { url.searchParams.set("sort", params.sort); } else { const s:any = S(); if (s.checklistDefaultSort) url.searchParams.set("sort", s.checklistDefaultSort); }
  return await req<ChecklistRow[]>(url.pathname + url.search);
}

export async function createChecklist(input: { name: string; category?: string | null }): Promise<void> {
  await req("/api/checklists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name, category: input.category ?? null }),
  });
}

export async function fetchChecklistItems(checklistId: number): Promise<ChecklistItemRow[]> {
  return await req<ChecklistItemRow[]>(`/api/checklists/${checklistId}/items`);
}

export async function addChecklistItem(checklistId: number, text: string): Promise<void> {
  await req(`/api/checklists/${checklistId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function toggleChecklistItem(checklistId: number, itemId: number): Promise<{ ok: boolean; done: 0 | 1 }> {
  return await req<{ ok: boolean; done: 0 | 1 }>(
    `/api/checklists/${checklistId}/items/${itemId}/toggle`,
    { method: "PATCH" }
  );
}

export async function reorderChecklistItems(checklistId: number, order: number[]): Promise<void> {
  await req(`/api/checklists/${checklistId}/items/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });
}

export async function deleteChecklistItem(checklistId: number, itemId: number): Promise<void> {
  await req(`/api/checklists/${checklistId}/items/${itemId}`, { method: "DELETE" });
}

export async function printChecklistText(id: number): Promise<string> {
  return await req<string>(`/api/checklists/${id}/print`);
}

//////////////////////////////////
// ---- RENOWN (client stub) --- //
//////////////////////////////////
export type RenownSummary = {
  total: number;
  groups: { group_id: string; name: string; total: number }[];
};

export type EarnedReward = {
  id: number;
  title: string;
  note?: string | null;
  source_type?: string | null;
  source_id?: number | string | null;
  granted_at: string;
  deltas: { group_id: string; delta: number }[];
};

export async function fetchRenownSummary(): Promise<RenownSummary> {
  // In Proto3, rewards are local on RewardsPage; keep this to satisfy Dashboard imports
  try {
    return await req<RenownSummary>("/api/renown/summary");
  } catch {
    return { total: 0, groups: [] };
  }
}

export async function fetchEarnedRewards(): Promise<EarnedReward[]> {
  try {
    return await req<EarnedReward[]>("/api/rewards/earned");
  } catch {
    return [];
  }
}

/* Renown groups (fallback) */
export type RenownGroup = { group_id: string; name: string };
export async function fetchRenownGroups(): Promise<RenownGroup[]> {
  console.warn("fetchRenownGroups(): backend not implemented; returning defaults");
  return [
    { group_id: "self", name: "Self" },
    { group_id: "home", name: "Home" },
    { group_id: "work", name: "Work" },
    { group_id: "community", name: "Community" },
  ];
}
export async function ensureRenownGroup(group_idOrName: string, displayName?: string): Promise<RenownGroup> {
  console.warn("ensureRenownGroup(): backend not implemented; echoing input");
  const id = (displayName ? group_idOrName : (group_idOrName || "")).toLowerCase().replace(/[^a-z0-9_]+/g,"_") || "custom";
  return { group_id: id, name: displayName || group_idOrName || "Custom" };
}

/////////////////////////////
// ---- QUESTS (stubs) --- //
/////////////////////////////
export type Quest = {
  id:number; title:string; summary?:string|null; status:"open"|"done";
  created_at?:string; total_steps:number; done_steps:number; percent:number
};
export type QuestStep = {
  id:number; quest_id:number; title:string; description?:string|null;
  order_index:number; status:"open"|"done"; created_at?:string; task_id?:number|null
};

export async function fetchQuests(): Promise<Quest[]> { console.warn("fetchQuests(): backend not implemented; returning []"); return []; }
export async function createQuest(_input:{ title:string; summary?:string|null }): Promise<{ok:boolean; id:number}> { console.warn("createQuest(): backend not implemented; returning mock id"); return { ok:true, id: Math.floor(Date.now()/1000) }; }
export async function fetchQuestSteps(_questId:number): Promise<QuestStep[]> { console.warn("fetchQuestSteps(): backend not implemented; returning []"); return []; }
export async function addQuestStep(_questId:number,_input:{ title:string; description?:string|null; order_index?:number; task_id?:number|null }): Promise<{ok:boolean; id:number}> { console.warn("addQuestStep(): backend not implemented; returning mock id"); return { ok:true, id: Math.floor(Date.now()/1000) }; }
export async function linkStepTask(_questId:number,_stepId:number,_task_id:number): Promise<{ok:boolean}> { console.warn("linkStepTask(): backend not implemented; no-op"); return { ok:true }; }
export async function setStepStatus(_questId:number,_stepId:number,_status:"open"|"done"): Promise<{ok:boolean}> { console.warn("setStepStatus(): backend not implemented; no-op"); return { ok:true }; }

/////////////////////////////////////////////
// ---- NEW: Task Categories (local) ---- //
/////////////////////////////////////////////
export type TaskCategory = { id:string; name:string; color:string; icon?:string };
const CAT_KEY = "task.categories.v1";

/** Read categories from localStorage (used by Dashboard/Tasks bucketing). */
export async function fetchTaskCategories(): Promise<TaskCategory[]> {
  try { return JSON.parse(localStorage.getItem(CAT_KEY) || "[]") as TaskCategory[]; }
  catch { return []; }
}

/** Overwrite categories in localStorage (not always needed by pages, but handy). */
export async function saveTaskCategories(rows: TaskCategory[]): Promise<void> {
  localStorage.setItem(CAT_KEY, JSON.stringify(rows || []));
}

/** Ensure a default set exists (optional helper, no-op if already present). */
export async function ensureDefaultCategories(): Promise<TaskCategory[]> {
  const cur = await fetchTaskCategories();
  if (Array.isArray(cur) && cur.length > 0) return cur;
  const seed: TaskCategory[] = [
    { id:"daily", name:"Daily", color:"#3b82f6", icon:"🗓️" },
    { id:"fitness", name:"Fitness", color:"#22c55e", icon:"💪" },
    { id:"food", name:"Food", color:"#f59e0b", icon:"🍲" },
    { id:"general", name:"General", color:"#6b7280", icon:"📌" },
  ];
  await saveTaskCategories(seed);
  return seed;
}

/////////////////////////////
// ---- NEW: Admin API --- //
/////////////////////////////
export type AdminCounts = { tasks:number; checklists:number; items:number };
export type AdminInfo = {
  cwd: string;
  db_path: string;
  journal_mode: string;
  wal: boolean;
  schema_version: number | null;
};
export type AdminHealth = {
  ok: boolean;
  db: { path:string; journal_mode:string; wal:boolean; schema_version:number|null };
  counts: AdminCounts;
  ts: string;
};

export async function adminCounts(): Promise<AdminCounts> {
  return await req<AdminCounts>("/api/admin/counts");
}

export async function adminInfo(): Promise<AdminInfo> {
  return await req<AdminInfo>("/api/admin/info");
}

export async function adminHealth(): Promise<AdminHealth> {
  return await req<AdminHealth>("/api/admin/health");
}

export async function adminBackup(): Promise<{ ok:boolean; files:string[] }> {
  return await req<{ ok:boolean; files:string[] }>("/api/admin/backup", { method:"POST" });
}

export async function adminVacuum(): Promise<{ ok:boolean }> {
  return await req<{ ok:boolean }>("/api/admin/vacuum", { method:"POST" });
}

export async function adminReindex(): Promise<{ ok:boolean }> {
  return await req<{ ok:boolean }>("/api/admin/reindex", { method:"POST" });
}

export async function adminClear(body: { scope:"tasks"|"checklists"|"all"; mode?:"soft"|"hard"; confirm:"DELETE MY DATA" }): Promise<{ ok:boolean }|{ ok:true; mode:string }> {
  return await req("/api/admin/clear", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  }) as any;
}
