/* ================================================================
   server.ts — Express + better-sqlite3
   Proto3 — clean reset (chat, tasks, checklists, journal, SSE)
================================================================ */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import * as path from "node:path";
import * as fs from "node:fs";

/* fetch polyfill for Node < 18 (harmless otherwise) */
try {
  // @ts-ignore
  if (!(globalThis as any).fetch) {
    const { fetch: undiciFetch } = require("undici");
    (globalThis as any).fetch = undiciFetch;
  }
} catch {}

/* Chat adapter */
import { chatOnce, chatStream } from "./adapter_lm";

/* === constants & DB bootstrap ============================================ */
const PORT = 8001;
const DB_PATH = "./app.db";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function tableExists(name: string): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}
function hasCol(table: string, name: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some(r => r.name === name);
}

/* core tables needed by UI */
function ensureTables(): void {
  db.transaction(() => {
    /* tasks */
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        task_id INTEGER PRIMARY KEY,
        user_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        priority INTEGER DEFAULT 1,
        xp_reward INTEGER DEFAULT 0,
        coin_reward INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT
      );
    `);

    /* checklists + items */
    db.exec(`
      CREATE TABLE IF NOT EXISTS checklists (
        checklist_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        created_at TEXT
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS checklist_items (
        item_id INTEGER PRIMARY KEY,
        checklist_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        position INTEGER,
        FOREIGN KEY(checklist_id) REFERENCES checklists(checklist_id) ON DELETE CASCADE
      );
    `);

    /* journal */
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        entry_id INTEGER PRIMARY KEY,
        ts TEXT,
        text TEXT,
        mood INTEGER,
        energy INTEGER,
        stress INTEGER,
        tags TEXT
      );
    `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_journal_entries_ts ON journal_entries(ts)");

    /* backfills / columns if old DBs */
    if (tableExists("checklist_items") && !hasCol("checklist_items","position")) {
      db.exec("ALTER TABLE checklist_items ADD COLUMN position INTEGER");
      db.exec("UPDATE checklist_items SET position = COALESCE(position, item_id)");
    }
  })();
}
ensureTables();

/* startup diagnostics */
console.log("[startup] cwd =", process.cwd());
const RESOLVED_DB = path.resolve(DB_PATH);
console.log("[startup] db  =", RESOLVED_DB, fs.existsSync(RESOLVED_DB) ? "(exists)" : "(missing)");

/* === small helpers ======================================================== */
function row<T = any>(sql: string, ...args: any[]) {
  return db.prepare(sql).get(...args) as T;
}
function all<T = any>(sql: string, ...args: any[]) {
  return db.prepare(sql).all(...args) as T[];
}
function run(sql: string, ...args: any[]) {
  return db.prepare(sql).run(...args);
}

/* === tools (unchanged) ==================================================== */
type ToolResult = { ok: true; result?: any } | { ok: false; error: string };

const tools: Record<string, (args: any) => ToolResult> = {
  "tasks.create": (args: any): ToolResult => {
    try {
      const title = String(args?.title ?? "").trim();
      if (!title) return { ok:false, error:"title required" };
      const description = args?.description ?? null;
      const category_id = (args?.category_id == null ? null : Number(args.category_id));
      const priority = Number(args?.priority ?? 1);
      const xp = Number(args?.xp ?? 0);
      const coins = Number(args?.coins ?? 0);
      run(
        `INSERT INTO tasks(user_id, title, description, category_id, priority, xp_reward, coin_reward, is_active, created_at)
         VALUES (?,?,?,?,?,?,?,1,COALESCE(?, CURRENT_TIMESTAMP))`,
        1, title, description, category_id, priority, xp, coins, null
      );
      const id = row<{ id:number }>("SELECT last_insert_rowid() AS id")?.id;
      return { ok:true, result:{ task_id: id } };
    } catch (e:any) {
      return { ok:false, error: String(e?.message ?? e) };
    }
  },

  "journal.save": (args: any): ToolResult => {
    try {
      const when = args?.ts || new Date().toISOString();
      const info = run(
        "INSERT INTO journal_entries(ts, text, mood, energy, stress, tags) VALUES (?,?,?,?,?,?)",
        when, String(args?.text ?? ""), Number(args?.mood ?? 0), Number(args?.energy ?? 0),
        Number(args?.stress ?? 0), String(args?.tags ?? "")
      );
      return { ok:true, result:{ entry_id: info.lastInsertRowid } };
    } catch (e:any) {
      return { ok:false, error: String(e?.message ?? e) };
    }
  },

  "checklists.addItem": (args: any): ToolResult => {
    try {
      const checklist_id = Number(args?.checklist_id ?? NaN);
      const text = String(args?.text ?? "").trim();
      if (!isFinite(checklist_id)) return { ok:false, error:"checklist_id required" };
      if (!text) return { ok:false, error:"text required" };
      const maxPos = row<{ max:number }>("SELECT COALESCE(MAX(position),0) AS max FROM checklist_items WHERE checklist_id=?", checklist_id)?.max ?? 0;
      const info = run("INSERT INTO checklist_items(checklist_id, text, completed, position) VALUES (?,?,0,?)", checklist_id, text, maxPos + 1);
      return { ok:true, result:{ item_id: info.lastInsertRowid, position: maxPos + 1 } };
    } catch (e:any) {
      return { ok:false, error: String(e?.message ?? e) };
    }
  },
};

function execTool(name: string, args: any): ToolResult {
  const fn = tools[name];
  if (!fn) return { ok:false, error:`unknown tool: ${name}` };
  try { return fn(args); } catch(e:any) { return { ok:false, error: String(e?.message ?? e) }; }
}

/* === app ================================================================== */
const app = express();
app.use(cors());
app.use(express.json());

/* errors as JSON */
app.use((err: any, _req, res, _next) => {
  const msg = (err && err.message) ? err.message : String(err);
  console.error("[error]", msg);
  res.status(500).json({ error: msg });
});

/* health */
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/api/admin/health", (_req, res) => {
  const journal = db.pragma("journal_mode", { simple: true }) as unknown as string;
  const user_version = db.pragma("user_version", { simple: true }) as unknown as number;
  const tasks = row<{ c: number }>("SELECT COUNT(*) c FROM tasks")?.c ?? 0;
  const checklists = row<{ c: number }>("SELECT COUNT(*) c FROM checklists")?.c ?? 0;
  const items = row<{ c: number }>("SELECT COUNT(*) c FROM checklist_items")?.c ?? 0;
  res.json({
    ok: true,
    db: { path: RESOLVED_DB, journal_mode: journal, wal: String(journal).toUpperCase().includes("WAL"), schema_version: user_version ?? null },
    counts: { tasks, checklists, items },
    ts: new Date().toISOString(),
  });
});

/* === JOURNAL ============================================================= */
app.post("/api/journal", (req, res) => {
  const { mood, energy, stress, tags, text } = req.body || {};
  const ts = new Date().toISOString();
  run("INSERT INTO journal_entries(ts, text, mood, energy, stress, tags) VALUES (?,?,?,?,?,?)",
    ts, String(text ?? ""), Number(mood ?? 0), Number(energy ?? 0), Number(stress ?? 0), String(tags ?? "")
  );
  const id = row<{ id:number }>("SELECT last_insert_rowid() AS id")?.id;
  res.json({ ok: true, id });
});

app.get("/api/journal/recent", (req, res) => {
  const now = new Date();
  const to = req.query.to ? new Date(String(req.query.to)) : now;
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(to.getTime() - 30*24*60*60*1000);
  const rows = all<{ entry_id:number; ts:string; text:string; mood:number|null; energy:number|null; stress:number|null; tags:string|null }>(
    "SELECT entry_id, ts, text, mood, energy, stress, tags FROM journal_entries WHERE ts BETWEEN ? AND ? ORDER BY ts DESC, entry_id DESC",
    from.toISOString(), to.toISOString()
  ).map(r => ({ id:r.entry_id, ts:r.ts, text:r.text, mood:r.mood??0, energy:r.energy??0, stress:r.stress??0, tags:r.tags??"" }));
  res.json({ from: from.toISOString(), to: to.toISOString(), rows });
});

/* === TASKS =============================================================== */
app.get("/api/tasks", (req, res) => {
  const { q, priority, sort, category_id } = req.query as any;
  const clauses: string[] = ["COALESCE(t.is_active,1)=1"];
  const params: any[] = [];
  if (q) { clauses.push("t.title LIKE ?"); params.push(`%${q}%`); }
  if (priority != null) { clauses.push("t.priority = ?"); params.push(Number(priority)); }
  if (category_id != null && category_id !== "") { clauses.push("t.category_id = ?"); params.push(Number(category_id)); }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const sortCol = sort === "title" ? "LOWER(t.title)" : sort === "priority" ? "t.priority" : "COALESCE(t.created_at,'')";
  const desc = sort === "title" ? "" : "DESC";
  const rows = all<any>(`
    SELECT t.task_id, t.title, t.description, t.priority,
           COALESCE(t.xp_reward,0) AS xp_reward,
           COALESCE(t.coin_reward,0) AS coin_reward,
           t.created_at, t.category_id
    FROM tasks t
    ${where}
    ORDER BY ${sortCol} ${desc}, t.task_id DESC
  `, ...params).map(r => ({
    task_id: r.task_id, title: r.title, description: r.description ?? null, priority: r.priority,
    xp: r.xp_reward ?? 0, coins: r.coin_reward ?? 0, created_at: r.created_at ?? null, category_id: r.category_id ?? null
  }));
  res.json(rows);
});

app.post("/api/tasks", (req, res) => {
  const { title, description = null, priority = 1, xp = 0, coins = 0, category_id = null } = req.body || {};
  if (!title || String(title).trim() === "") return res.status(400).json({ error: "Title required" });
  run(
    `INSERT INTO tasks(user_id, title, description, category_id, priority, xp_reward, coin_reward, is_active, created_at)
     VALUES (?,?,?,?,?,?,?,1,COALESCE(?, CURRENT_TIMESTAMP))`,
    1, String(title).trim(), description, (category_id==null? null : Number(category_id)),
    Number(priority), Number(xp ?? 0), Number(coins ?? 0), null
  );
  res.status(204).end();
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const { title, description = null, priority, xp, coins, category_id } = req.body || {};
  const cur = row("SELECT task_id FROM tasks WHERE task_id=?", id);
  if (!cur) return res.status(404).json({ error: "Not found" });
  run(`
    UPDATE tasks SET
      title        = COALESCE(?, title),
      description  = ?,
      category_id  = COALESCE(?, category_id),
      priority     = COALESCE(?, priority),
      xp_reward    = COALESCE(?, xp_reward),
      coin_reward  = COALESCE(?, coin_reward)
    WHERE task_id = ?
  `, title ?? null, description, (category_id==null? null : Number(category_id)), priority ?? null, xp ?? null, coins ?? null, id);
  res.status(204).end();
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  run("DELETE FROM tasks WHERE task_id=?", id);
  res.json({ ok: true });
});

app.post("/api/tasks/:id/complete", (req, res) => {
  const id = Number(req.params.id);
  const cur = row("SELECT task_id FROM tasks WHERE task_id=?", id);
  if (!cur) return res.status(404).json({ error: "Not found" });
  run("UPDATE tasks SET is_active=0 WHERE task_id=?", id);
  res.json({ ok: true, completion_id: Date.now() });
});

/* === CHECKLISTS ========================================================== */
app.get("/api/checklists", (req, res) => {
  const { q, category, sort } = req.query as any;
  const clauses: string[] = [];
  const params: any[] = [];
  if (q) { clauses.push("c.name LIKE ?"); params.push(`%${q}%`); }
  if (category) { clauses.push("c.category = ?"); params.push(category); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const order = sort === "name" ? "LOWER(c.name) ASC" : "COALESCE(c.created_at,'') DESC, c.checklist_id DESC";
  const rows = all<any>(`
    SELECT c.checklist_id, c.name, c.category, c.created_at,
           COALESCE((SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id=c.checklist_id),0) AS items
    FROM checklists c
    ${where}
    ORDER BY ${order}
  `, ...params).map(r => ({ id:r.checklist_id, name:r.name, category:r.category ?? null, created_at:r.created_at ?? null, items:r.items ?? 0 }));
  res.json(rows);
});

app.post("/api/checklists", (req, res) => {
  const { name, category = null } = req.body || {};
  if (!name || String(name).trim()==="") return res.status(400).json({ error:"Name required" });
  run("INSERT INTO checklists(name, category, created_at) VALUES (?,?,COALESCE(?, CURRENT_TIMESTAMP))", String(name).trim(), category, null);
  res.status(204).end();
});

app.get("/api/checklists/:id/items", (req, res) => {
  const id = Number(req.params.id);
  const rows = all<any>(`
    SELECT i.item_id, i.checklist_id, i.text, COALESCE(i.completed,0) AS completed, COALESCE(i.position,i.item_id) AS position
    FROM checklist_items i
    WHERE i.checklist_id=?
    ORDER BY COALESCE(i.position,i.item_id) ASC, i.item_id ASC
  `, id).map(r => ({ id:r.item_id, checklist_id:r.checklist_id, text:r.text, done:(r.completed?1:0) as 0|1, position:r.position ?? undefined }));
  res.json(rows);
});

app.post("/api/checklists/:id/items", (req, res) => {
  const id = Number(req.params.id);
  const { text } = req.body || {};
  if (!text || String(text).trim()==="") return res.status(400).json({ error:"Text required" });
  const maxPos = row<{ max:number }>("SELECT COALESCE(MAX(position),0) AS max FROM checklist_items WHERE checklist_id=?", id)?.max ?? 0;
  run("INSERT INTO checklist_items(checklist_id, text, completed, position) VALUES (?,?,0,?)", id, String(text).trim(), maxPos + 1);
  res.status(204).end();
});

app.patch("/api/checklists/:id/items/:itemId/toggle", (req, res) => {
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const cur = row<{ completed?: 0|1 }>("SELECT completed FROM checklist_items WHERE item_id=? AND checklist_id=?", itemId, id);
  if (!cur) return res.status(404).json({ error:"Not found" });
  const next = cur.completed === 1 ? 0 : 1;
  run("UPDATE checklist_items SET completed=? WHERE item_id=? AND checklist_id=?", next, itemId, id);
  res.json({ ok:true, done: next });
});

app.delete("/api/checklists/:id/items/:itemId", (req, res) => {
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  run("DELETE FROM checklist_items WHERE item_id=? AND checklist_id=?", itemId, id);
  res.json({ ok:true });
});

app.patch("/api/checklists/:id/items/reorder", (req, res) => {
  const id = Number(req.params.id);
  const { order } = req.body as { order: number[] };
  if (!Array.isArray(order)) return res.status(400).json({ error:"order array required" });
  const upd = db.prepare("UPDATE checklist_items SET position=? WHERE item_id=? AND checklist_id=?");
  const tx = db.transaction((ids: number[]) => { ids.forEach((itemId, idx) => upd.run(idx + 1, itemId, id)); });
  tx(order);
  res.json({ ok:true });
});

app.get("/api/checklists/:id/print", (req, res) => {
  const id = Number(req.params.id);
  const list = row<{ checklist_id:number; name:string }>("SELECT checklist_id, name FROM checklists WHERE checklist_id=?", id);
  if (!list) return res.status(404).send("Not found");
  const items = all<{ text:string; completed:0|1 }>("SELECT text, COALESCE(completed,0) AS completed FROM checklist_items WHERE checklist_id=? ORDER BY COALESCE(position,item_id), item_id", id);
  const lines = [
    `Checklist: ${list.name}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    ...items.map((it, i) => `[${it.completed ? "x" : " "}] ${i + 1}. ${it.text}`),
  ];
  const txt = lines.join("\n");
  try { fs.writeFileSync("last_print.txt", txt, "utf-8"); } catch {}
  res.type("text/plain").send(txt);
});

/* === Chat helpers ======================================================== */
function buildSystemFromContext(agent: string, context: string): string {
  const pre = `You are ${agent || "Assistant"}, a concise, helpful copilot for a personal productivity app. Prefer short, actionable answers.`;
  const ctx = context && context.trim() ? `\n\nContext:\n${context.trim()}` : "";
  return pre + ctx;
}

/* === Chat (non-stream) =================================================== */
app.post("/api/chat", async (req, res) => {
  try {
    const { message = "", agent = "Assistant", model = "lmstudio", context = "", lmBase = "" } = req.body || {};
    const system = buildSystemFromContext(agent, context);
    const reply = await chatOnce({ message, system, model, baseUrl: lmBase || undefined });
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

/* === Tools helper endpoints (for preview UI) ============================= */
// List available tools (names only for now)
app.get("/api/tools", (_req, res) => {
  res.json({ ok: true, tools: Object.keys(tools) });
});
// Execute a tool (called after user confirms in the UI)
app.post("/api/tools/execute", (req, res) => {
  const { name, args } = req.body || {};
  const result = execTool(String(name ?? ""), args ?? {});
  res.json(result);
});

/* === Chat (SSE stream) with toolcall PREVIEW ============================= */
app.get("/api/chat/stream", async (req, res) => {
  // --- SSE headers ---
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  (res as any).flushHeaders?.();

  // --- inputs ---
  const message = String(req.query.message ?? "");
  const agent   = String(req.query.agent ?? "Assistant");
  const model   = String(req.query.model ?? "lmstudio");
  const base    = String(req.query.lmBase ?? "http://127.0.0.1:1234").replace(/\/+$/,"");
  const context = String(req.query.context ?? "");
  const system  = buildSystemFromContext(agent, context);

  // Optional auth header if provided via env
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  const token = process.env.LM_STUDIO_API_KEY || process.env.LM_TOKEN || "";
  if (token) headers.Authorization = `Bearer ${token}`;

  // --- heartbeat (keep proxies happy) ---
  let closed = false;
  const hb = setInterval(() => { if (!closed) res.write(": hb\n\n"); }, 15000);
  req.on("close", () => { closed = true; clearInterval(hb); try { res.end(); } catch {} });

  // helper: try to emit preview if a line is a JSON toolcall
  function maybeEmitToolPreview(line: string): boolean {
    const s = line.trim();
    if (!s || s === "[DONE]") return false;
    if (!(s.startsWith("{") && s.endsWith("}"))) return false;
    try {
      const payload = JSON.parse(s);
      if (payload && payload.type === "toolcall" && payload.name) {
        const safe = { type: "toolcall", name: String(payload.name), args: payload.args ?? {}, preview: true };
        res.write(`data: ${JSON.stringify(safe)}\n\n`);
        return true;
      }
    } catch {}
    return false;
  }

  try {
    // POST to LM Studio with stream: true
    const upstream = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: message },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errTxt = await upstream.text().catch(()=>String(upstream.status));
      if (!closed) res.write(`data: [ERROR] upstream ${upstream.status} ${errTxt}\n\n`);
      if (!closed) { res.write("data: [[END]]\n\n"); res.end(); }
      return;
    }

    // Read LM Studio SSE, forward text deltas, and surface toolcall PREVIEW frames
    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    let done = false, buf = "";

    while (!done && !closed) {
      const { value, done: d } = await reader.read();
      done = d;
      if (!value) continue;

      buf += dec.decode(value, { stream: !done });
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || "";

      for (const raw of lines) {
        const s = raw.replace(/^data:\s?/, "").trim();
        if (!s) continue;
        if (s === "[DONE]") { done = true; break; }

        // JSON chunk from LM Studio -> try delta first
        if (s.startsWith("{")) {
          try {
            const j = JSON.parse(s);
            const delta = j?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              // Write plain text frames
              const out = String(delta).replace(/\r\n/g, "\n");
              res.write(`data: ${out}\n\n`);
              // Also check each completed line inside delta for a toolcall preview
              out.split(/\n/).forEach(line => { if (maybeEmitToolPreview(line)) {/* preview sent */} });
              continue;
            }
            // If no delta, still check if it's a complete toolcall line
            if (maybeEmitToolPreview(s)) continue;
          } catch {
            // fallthrough to raw forward
          }
        }

        // Raw non-JSON line (rare) ? forward
        res.write(`data: ${s}\n\n`);
        // And try preview detection on the raw string
        maybeEmitToolPreview(s);
      }
    }
  } catch (err: any) {
    if (!closed) res.write(`data: [ERROR] ${String(err?.message ?? err)}\n\n`);
  } finally {
    clearInterval(hb);
    if (!closed) { res.write("data: [[END]]\n\n"); res.end(); }
  }
});

/* === start =============================================================== */
app.listen(PORT, () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});
