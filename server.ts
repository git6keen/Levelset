import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { capStr, capNum } from "./validate";
import { formatChecklist } from "./printer_formatter";
import { logEvent, getEvents } from "./trace";
import { executeTool } from "./tools";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));

const db = new Database("./app.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8001;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function apiError(res: express.Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function safeInt(x: any, fallback = 0): number {
  const n = parseInt(String(x), 10);
  return isNaN(n) ? fallback : n;
}

// ============================================================================
// TASKS API
// ============================================================================

app.get("/api/tasks", (req, res) => {
  try {
    const { q, priority, sort, category_id } = req.query;
    
    let sql = "SELECT task_id, title, description, priority, xp_reward as xp, coin_reward as coins, category_id, created_at, due_date, due_time FROM tasks WHERE is_active = 1";
    const params: any[] = [];

    // Search filter
    if (q && String(q).trim()) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      const search = `%${String(q).trim()}%`;
      params.push(search, search);
    }

    // Priority filter
    if (priority && !isNaN(Number(priority))) {
      sql += " AND priority = ?";
      params.push(Number(priority));
    }

    // Category filter
    if (category_id !== undefined) {
      if (category_id === "" || category_id === "null") {
        sql += " AND category_id IS NULL";
      } else if (!isNaN(Number(category_id))) {
        sql += " AND category_id = ?";
        params.push(Number(category_id));
      }
    }

    // Sorting
    const sortField = String(sort || "created_at");
    if (["priority", "title", "created_at"].includes(sortField)) {
      if (sortField === "created_at") {
        sql += " ORDER BY created_at DESC";
      } else {
        sql += ` ORDER BY ${sortField}`;
      }
    } else {
      sql += " ORDER BY created_at DESC";
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error: any) {
    console.error("GET /api/tasks:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const { title, description, priority, xp, coins, category_id, due_date, due_time } = req.body;

    const cleanTitle = capStr(title, 200);
    const cleanDesc = description ? capStr(description, 1000) : null;
    const cleanPrio = capNum(priority ?? 3, 1, 5);
    const cleanXp = capNum(xp ?? 0, 0, 1000);
    const cleanCoins = capNum(coins ?? 0, 0, 100);
    const cleanCatId = category_id ? capNum(category_id, 1, 999999) : null;
    const cleanDueDate = due_date || null;
    const cleanDueTime = due_time || null;

    if (!cleanTitle.trim()) {
      return apiError(res, 400, "Title is required");
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, priority, xp_reward, coin_reward, category_id, due_date, due_time, created_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(cleanTitle, cleanDesc, cleanPrio, cleanXp, cleanCoins, cleanCatId, cleanDueDate, cleanDueTime, new Date().toISOString());
    
    res.json({ 
      ok: true, 
      task_id: result.lastInsertRowid,
      title: cleanTitle,
      priority: cleanPrio
    });
  } catch (error: any) {
    console.error("POST /api/tasks:", error);
    apiError(res, 500, error.message);
  }
});

app.patch("/api/tasks/:id", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    if (id <= 0) return apiError(res, 400, "Invalid task ID");

    const updates = req.body;
    const allowed = ["title", "description", "priority", "xp_reward", "coin_reward", "category_id", "due_date", "due_time"];
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key) && value !== undefined) {
        if (key === "title") {
          const clean = capStr(String(value), 200);
          if (!clean.trim()) continue;
          fields.push("title = ?");
          values.push(clean);
        } else if (key === "description") {
          fields.push("description = ?");
          values.push(value ? capStr(String(value), 1000) : null);
        } else if (key === "priority") {
          fields.push("priority = ?");
          values.push(capNum(value, 1, 5));
        } else if (key === "xp_reward") {
          fields.push("xp_reward = ?");
          values.push(capNum(value, 0, 1000));
        } else if (key === "coin_reward") {
          fields.push("coin_reward = ?");
          values.push(capNum(value, 0, 100));
        } else if (key === "category_id") {
          fields.push("category_id = ?");
          values.push(value ? capNum(value, 1, 999999) : null);
        } else if (key === "due_date") {
          fields.push("due_date = ?");
          values.push(value || null);
        } else if (key === "due_time") {
          fields.push("due_time = ?");
          values.push(value || null);
        }
      }
    }

    if (fields.length === 0) {
      return apiError(res, 400, "No valid fields to update");
    }

    const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE task_id = ? AND is_active = 1`;
    values.push(id);

    const stmt = db.prepare(sql);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return apiError(res, 404, "Task not found");
    }

    res.json({ ok: true, updated: result.changes });
  } catch (error: any) {
    console.error("PATCH /api/tasks/:id:", error);
    apiError(res, 500, error.message);
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    if (id <= 0) return apiError(res, 400, "Invalid task ID");

    // Soft delete by setting is_active = 0
    const stmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ? AND is_active = 1");
    const result = stmt.run(id);

    if (result.changes === 0) {
      return apiError(res, 404, "Task not found");
    }

    res.json({ ok: true, deleted: result.changes });
  } catch (error: any) {
    console.error("DELETE /api/tasks/:id:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/tasks/:id/complete", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    if (id <= 0) return apiError(res, 400, "Invalid task ID");

    const { note } = req.body;

    // Get task details
    const task = db.prepare("SELECT task_id, title, xp_reward, coin_reward FROM tasks WHERE task_id = ? AND is_active = 1").get(id);
    if (!task) {
      return apiError(res, 404, "Task not found");
    }

    const taskData = task as { task_id: number; title: string; xp_reward: number; coin_reward: number };

    // Create completion record with user_id
    const completionStmt = db.prepare(`
      INSERT INTO task_completions (task_id, user_id, quality_rating, xp_earned, coins_earned, completed_at)
      VALUES (?, 1, ?, ?, ?, ?)
    `);
    
    const completionResult = completionStmt.run(
      id, 
      null, // quality_rating (could be added later)
      taskData.xp_reward || 0,
      taskData.coin_reward || 0,
      new Date().toISOString()
    );

    // Soft delete the task (mark as inactive)
    const deleteStmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ?");
    deleteStmt.run(id);

    res.json({ 
      ok: true, 
      completion_id: completionResult.lastInsertRowid,
      task_title: taskData.title,
      xp_earned: taskData.xp_reward || 0,
      coins_earned: taskData.coin_reward || 0
    });
  } catch (error: any) {
    console.error("POST /api/tasks/:id/complete:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// CHECKLISTS API
// ============================================================================

app.get("/api/checklists", (req, res) => {
  try {
    const { q, category, sort } = req.query;
    
    let sql = "SELECT checklist_id as id, name, category, created_at FROM checklists";
    const params: any[] = [];

    // Search filter
    if (q && String(q).trim()) {
      sql += " WHERE name LIKE ?";
      params.push(`%${String(q).trim()}%`);
    }

    // Category filter
    if (category && String(category).trim()) {
      sql += (sql.includes("WHERE") ? " AND" : " WHERE") + " category = ?";
      params.push(String(category).trim());
    }

    // Sorting
    const sortField = String(sort || "name");
    if (["name", "created_at"].includes(sortField)) {
      sql += ` ORDER BY ${sortField}`;
    } else {
      sql += " ORDER BY name";
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error: any) {
    console.error("GET /api/checklists:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/checklists", (req, res) => {
  try {
    const { name, category } = req.body;

    const cleanName = capStr(name, 200);
    const cleanCategory = category ? capStr(category, 100) : null;

    if (!cleanName.trim()) {
      return apiError(res, 400, "Name is required");
    }

    const stmt = db.prepare(`
      INSERT INTO checklists (user_id, name, category, created_at)
      VALUES (1, ?, ?, ?)
    `);
    
    const result = stmt.run(cleanName, cleanCategory, new Date().toISOString());
    
    res.json({ 
      ok: true, 
      checklist_id: result.lastInsertRowid,
      name: cleanName,
      category: cleanCategory
    });
  } catch (error: any) {
    console.error("POST /api/checklists:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/checklists/:id/items", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    if (id <= 0) return apiError(res, 400, "Invalid checklist ID");

    const stmt = db.prepare(`
      SELECT item_id as id, checklist_id, text, completed as done, position
      FROM checklist_items
      WHERE checklist_id = ?
      ORDER BY position ASC, item_id ASC
    `);
    
    const rows = stmt.all(id);
    res.json(rows);
  } catch (error: any) {
    console.error("GET /api/checklists/:id/items:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/checklists/:id/items", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    if (id <= 0) return apiError(res, 400, "Invalid checklist ID");

    const { text } = req.body;
    const cleanText = capStr(text, 500);

    if (!cleanText.trim()) {
      return apiError(res, 400, "Item text is required");
    }

    // Check if checklist exists
    const checklist = db.prepare("SELECT checklist_id FROM checklists WHERE checklist_id = ?").get(id);
    if (!checklist) {
      return apiError(res, 404, "Checklist not found");
    }

    // Get next position
    const maxPos = db.prepare("SELECT COALESCE(MAX(position), 0) as max_pos FROM checklist_items WHERE checklist_id = ?").get(id) as any;
    const position = (maxPos?.max_pos || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO checklist_items (checklist_id, text, completed, position)
      VALUES (?, ?, 0, ?)
    `);
    
    const result = stmt.run(id, cleanText, position);
    
    res.json({ 
      ok: true, 
      item_id: result.lastInsertRowid,
      text: cleanText,
      position
    });
  } catch (error: any) {
    console.error("POST /api/checklists/:id/items:", error);
    apiError(res, 500, error.message);
  }
});

app.patch("/api/checklists/:id/items/:itemId/toggle", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    const itemId = safeInt(req.params.itemId);
    
    if (id <= 0 || itemId <= 0) {
      return apiError(res, 400, "Invalid IDs");
    }

    // Toggle completion status
    const stmt = db.prepare(`
      UPDATE checklist_items 
      SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END
      WHERE checklist_id = ? AND item_id = ?
    `);
    
    const result = stmt.run(id, itemId);
    
    if (result.changes === 0) {
      return apiError(res, 404, "Item not found");
    }

    // Get new status
    const statusStmt = db.prepare("SELECT completed FROM checklist_items WHERE item_id = ?");
    const statusResult = statusStmt.get(itemId) as any;
    
    res.json({ 
      ok: true, 
      done: statusResult?.completed || 0
    });
  } catch (error: any) {
    console.error("PATCH /api/checklists/:id/items/:itemId/toggle:", error);
    apiError(res, 500, error.message);
  }
});

app.delete("/api/checklists/:id/items/:itemId", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    const itemId = safeInt(req.params.itemId);
    
    if (id <= 0 || itemId <= 0) {
      return apiError(res, 400, "Invalid IDs");
    }

    const stmt = db.prepare("DELETE FROM checklist_items WHERE checklist_id = ? AND item_id = ?");
    const result = stmt.run(id, itemId);
    
    if (result.changes === 0) {
      return apiError(res, 404, "Item not found");
    }

    res.json({ ok: true, deleted: result.changes });
  } catch (error: any) {
    console.error("DELETE /api/checklists/:id/items/:itemId:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/checklists/:id/print", (req, res) => {
  try {
    const id = safeInt(req.params.id);
    if (id <= 0) return apiError(res, 400, "Invalid checklist ID");

    // Get checklist info
    const checklist = db.prepare("SELECT name FROM checklists WHERE checklist_id = ?").get(id) as any;
    if (!checklist) {
      return apiError(res, 404, "Checklist not found");
    }

    // Get items
    const items = db.prepare(`
      SELECT text, completed as done
      FROM checklist_items
      WHERE checklist_id = ?
      ORDER BY position ASC, item_id ASC
    `).all(id) as any[];

    const formatted = formatChecklist(checklist.name, items);
    
    res.setHeader("Content-Type", "text/plain");
    res.send(formatted);
  } catch (error: any) {
    console.error("GET /api/checklists/:id/print:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// JOURNAL API
// ============================================================================

app.post("/api/journal", (req, res) => {
  try {
    const { text, mood, energy, stress, tags, ts } = req.body;

    const cleanText = capStr(text, 5000);
    const cleanMood = capNum(mood, 1, 10);
    const cleanEnergy = capNum(energy, 1, 10);
    const cleanStress = capNum(stress, 1, 10);
    const cleanTags = tags ? capStr(tags, 200) : "";
    const timestamp = ts || new Date().toISOString();

    if (!cleanText.trim()) {
      return apiError(res, 400, "Journal text is required");
    }

    // Create journal table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        text TEXT NOT NULL,
        mood INTEGER,
        energy INTEGER,
        stress INTEGER,
        tags TEXT,
        created_at TEXT
      )
    `);

    const stmt = db.prepare(`
      INSERT INTO journal_entries (user_id, text, mood, energy, stress, tags, created_at)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(cleanText, cleanMood, cleanEnergy, cleanStress, cleanTags, timestamp);
    
    res.json({ 
      ok: true, 
      id: result.lastInsertRowid,
      mood: cleanMood,
      energy: cleanEnergy,
      stress: cleanStress
    });
  } catch (error: any) {
    console.error("POST /api/journal:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/journal/recent", (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Create journal table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY,
        user_id INTEGER DEFAULT 1,
        text TEXT NOT NULL,
        mood INTEGER,
        energy INTEGER,
        stress INTEGER,
        tags TEXT,
        created_at TEXT
      )
    `);

    let sql = "SELECT created_at as ts, mood, energy, stress, tags FROM journal_entries";
    const params: any[] = [];

    if (from || to) {
      const conditions: string[] = [];
      if (from) {
        conditions.push("created_at >= ?");
        params.push(String(from));
      }
      if (to) {
        conditions.push("created_at <= ?");
        params.push(String(to));
      }
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC LIMIT 100";

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    
    res.json({ rows });
  } catch (error: any) {
    console.error("GET /api/journal/recent:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// CHAT API
// ============================================================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, agent = "Assistant", model = "lmstudio", context = "", lmBase = "http://127.0.0.1:1234" } = req.body;

    if (!message?.trim()) {
      return apiError(res, 400, "Message is required");
    }

    logEvent("chat_request", { agent, model, message: message.substring(0, 100) });

    // Import and use the LM adapter
    const { chatOnce, buildSystemPrompt } = await import("./adapter_lm");
    const systemPrompt = buildSystemPrompt(agent, context);

    try {
      const reply = await chatOnce({
        message: message.trim(),
        system: systemPrompt,
        model,
        baseUrl: lmBase,
        temperature: 0.7,
        max_tokens: 2000,
      });

      res.json({ reply });
    } catch (error: any) {
      console.error("LM chat error:", error);
      res.json({ reply: `Error: ${error.message || "Failed to get response from language model"}` });
    }
  } catch (error: any) {
    console.error("POST /api/chat:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/chat/stream", async (req, res) => {
  try {
    const { message, agent = "Assistant", model = "lmstudio", context = "", lmBase = "http://127.0.0.1:1234" } = req.query;

    if (!message || !String(message).trim()) {
      return apiError(res, 400, "Message is required");
    }

    logEvent("chat_stream_request", { agent, model, message: String(message).substring(0, 100) });

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    try {
      // Import and use the LM adapter
      const { chatStream, buildSystemPrompt } = await import("./adapter_lm");
      const systemPrompt = buildSystemPrompt(String(agent), String(context));

      await chatStream({
        message: String(message).trim(),
        system: systemPrompt,
        model: String(model),
        baseUrl: String(lmBase),
        temperature: 0.7,
        max_tokens: 2000,
        onChunk: (chunk: string) => {
          res.write(`data: ${chunk}\n\n`);
        },
      });

      res.write("data: [[END]]\n\n");
      res.end();
    } catch (error: any) {
      console.error("LM stream error:", error);
      res.write(`data: [ERROR] ${error.message || "Stream failed"}\n\n`);
      res.write("data: [[END]]\n\n");
      res.end();
    }
  } catch (error: any) {
    console.error("GET /api/chat/stream:", error);
    res.write(`data: [ERROR] Server error\n\n`);
    res.write("data: [[END]]\n\n");
    res.end();
  }
});

// ============================================================================
// TOOLS API (UPDATED TO USE NEW TOOLS MODULE)
// ============================================================================

app.post("/api/tools/exec", async (req, res) => {
  try {
    const { name, args } = req.body;

    if (!name || typeof name !== "string") {
      return apiError(res, 400, "Tool name is required");
    }

    if (!args || typeof args !== "object") {
      return apiError(res, 400, "Tool args are required");
    }

    logEvent("tool_exec", { name, args });

    // Use the new tools module
    const result = await executeTool(name, args);
    
    if (result.ok) {
      res.json(result);
    } else {
      // Return error details but with 200 status so ChatPage can handle it properly
      res.json(result);
    }
  } catch (error: any) {
    console.error("POST /api/tools/exec:", error);
    res.json({ 
      ok: false, 
      error: "Tool execution failed", 
      details: error.message 
    });
  }
});

// ============================================================================
// ADMIN API
// ============================================================================

app.get("/api/admin/health", (req, res) => {
  try {
    // Get DB info
    const journalMode = db.pragma("journal_mode", { simple: true }) as string;
    const schemaVersion = db.pragma("user_version", { simple: true }) as number;
    
    // Get counts
    const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1").get() as any;
    const checklistCount = db.prepare("SELECT COUNT(*) as count FROM checklists").get() as any;
    const itemCount = db.prepare("SELECT COUNT(*) as count FROM checklist_items").get() as any;

    res.json({
      ok: true,
      db: {
        path: "./app.db",
        journal_mode: journalMode,
        wal: journalMode.toLowerCase() === "wal",
        schema_version: schemaVersion
      },
      counts: {
        tasks: taskCount?.count || 0,
        checklists: checklistCount?.count || 0,
        items: itemCount?.count || 0
      },
      ts: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("GET /api/admin/health:", error);
    res.json({
      ok: false,
      error: error.message,
      ts: new Date().toISOString()
    });
  }
});

app.post("/api/admin/backup", (req, res) => {
  try {
    // Simple backup by copying DB file with timestamp
    const fs = require("fs");
    const timestamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const backupPath = `./app-backup-${timestamp}.db`;
    
    fs.copyFileSync("./app.db", backupPath);
    
    res.json({ 
      ok: true, 
      files: [backupPath]
    });
  } catch (error: any) {
    console.error("POST /api/admin/backup:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/admin/vacuum", (req, res) => {
  try {
    db.exec("VACUUM");
    res.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/admin/vacuum:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/admin/reindex", (req, res) => {
  try {
    db.exec("REINDEX");
    res.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/admin/reindex:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/admin/clear", (req, res) => {
  try {
    const { scope, mode = "soft", confirm } = req.body;
    
    if (confirm !== "DELETE MY DATA") {
      return apiError(res, 400, "Confirmation required");
    }

    switch (scope) {
      case "tasks":
        if (mode === "hard") {
          db.exec("DELETE FROM task_completions");
          db.exec("DELETE FROM tasks");
          res.json({ ok: true, mode: "hard", cleared: ["tasks", "task_completions"] });
        } else {
          const result = db.prepare("UPDATE tasks SET is_active = 0 WHERE is_active = 1").run();
          res.json({ ok: true, mode: "soft", affected: result.changes });
        }
        break;
        
      case "checklists":
        db.exec("DELETE FROM checklist_items");
        db.exec("DELETE FROM checklists");
        res.json({ ok: true, cleared: ["checklists", "checklist_items"] });
        break;
        
      case "all":
        db.exec("DELETE FROM task_completions");
        db.exec("DELETE FROM tasks");
        db.exec("DELETE FROM checklist_items");
        db.exec("DELETE FROM checklists");
        // Clear journal if table exists
        try {
          db.exec("DELETE FROM journal_entries");
        } catch {
          // Table might not exist
        }
        res.json({ ok: true, cleared: ["all_tables"] });
        break;
        
      default:
        return apiError(res, 400, "Invalid scope");
    }
  } catch (error: any) {
    console.error("POST /api/admin/clear:", error);
    apiError(res, 500, error.message);
  }
});

// Export endpoints for download
app.get("/api/admin/export/tasks", (req, res) => {
  try {
    const { format = "json" } = req.query;
    const tasks = db.prepare("SELECT * FROM tasks WHERE is_active = 1 ORDER BY created_at DESC").all();
    
    if (format === "csv") {
      let csv = "task_id,title,description,priority,xp_reward,coin_reward,created_at\n";
      tasks.forEach((task: any) => {
        csv += `${task.task_id},"${(task.title || '').replace(/"/g, '""')}","${(task.description || '').replace(/"/g, '""')}",${task.priority},${task.xp_reward},${task.coin_reward},${task.created_at}\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(csv);
    } else if (format === "txt") {
      let txt = "TASKS EXPORT\n" + "=".repeat(50) + "\n\n";
      tasks.forEach((task: any) => {
        txt += `ID: ${task.task_id}\n`;
        txt += `Title: ${task.title}\n`;
        txt += `Description: ${task.description || '(none)'}\n`;
        txt += `Priority: ${task.priority}\n`;
        txt += `XP: ${task.xp_reward}, Coins: ${task.coin_reward}\n`;
        txt += `Created: ${task.created_at}\n`;
        txt += "-".repeat(30) + "\n\n";
      });
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.txt"`);
      res.send(txt);
    } else {
      res.json(tasks);
    }
  } catch (error: any) {
    console.error("GET /api/admin/export/tasks:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/admin/export/checklists", (req, res) => {
  try {
    const { format = "json" } = req.query;
    
    // Get checklists with their items
    const checklists = db.prepare("SELECT * FROM checklists ORDER BY created_at DESC").all();
    const result = checklists.map((checklist: any) => {
      const items = db.prepare("SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC, item_id ASC").all(checklist.checklist_id);
      return { ...checklist, items };
    });
    
    if (format === "csv") {
      let csv = "checklist_id,name,category,created_at,item_count\n";
      result.forEach((checklist: any) => {
        csv += `${checklist.checklist_id},"${(checklist.name || '').replace(/"/g, '""')}","${(checklist.category || '').replace(/"/g, '""')}",${checklist.created_at},${checklist.items.length}\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="checklists-${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(csv);
    } else if (format === "txt") {
      let txt = "CHECKLISTS EXPORT\n" + "=".repeat(50) + "\n\n";
      result.forEach((checklist: any) => {
        txt += `ID: ${checklist.checklist_id}\n`;
        txt += `Name: ${checklist.name}\n`;
        txt += `Category: ${checklist.category || '(none)'}\n`;
        txt += `Created: ${checklist.created_at}\n`;
        txt += `Items (${checklist.items.length}):\n`;
        checklist.items.forEach((item: any, index: number) => {
          txt += `  ${index + 1}. [${item.completed ? 'x' : ' '}] ${item.text}\n`;
        });
        txt += "-".repeat(30) + "\n\n";
      });
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename="checklists-${new Date().toISOString().slice(0,10)}.txt"`);
      res.send(txt);
    } else {
      res.json(result);
    }
  } catch (error: any) {
    console.error("GET /api/admin/export/checklists:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/admin/export/snapshot", (req, res) => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks WHERE is_active = 1").all();
    const checklists = db.prepare("SELECT * FROM checklists").all();
    const items = db.prepare("SELECT * FROM checklist_items").all();
    
    let journal_entries = [];
    try {
      journal_entries = db.prepare("SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 100").all();
    } catch {
      // Journal table might not exist
    }

    const snapshot = {
      export_date: new Date().toISOString(),
      tasks,
      checklists,
      checklist_items: items,
      journal_entries,
      stats: {
        active_tasks: tasks.length,
        total_checklists: checklists.length,
        total_items: items.length,
        journal_entries: journal_entries.length
      }
    };

    res.setHeader("Content-Disposition", `attachment; filename="snapshot-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(snapshot);
  } catch (error: any) {
    console.error("GET /api/admin/export/snapshot:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// DEV/DEBUG ENDPOINTS
// ============================================================================

app.get("/api/trace", (req, res) => {
  try {
    const events = getEvents();
    res.json({ events });
  } catch (error: any) {
    console.error("GET /api/trace:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  console.log(`Database: ./app.db (${db.pragma("journal_mode", { simple: true })})`);
  
  logEvent("server_start", { port: PORT, journal_mode: db.pragma("journal_mode", { simple: true }) });
});