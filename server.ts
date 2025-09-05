import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { capStr, capNum } from "./validate.js";
import { formatChecklist } from "./printer_formatter.js";
import { logEvent, getEvents } from "./trace.js";
import { executeTool } from "./tools.js";

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
    const sortMap: Record<string, string> = {
      "priority": "priority DESC, created_at DESC",
      "title": "title ASC",
      "created_at": "created_at DESC"
    };
    const sortClause = sortMap[String(sort)] || "priority DESC, created_at DESC";
    sql += ` ORDER BY ${sortClause}`;

    const stmt = db.prepare(sql);
    const tasks = stmt.all(...params);
    
    res.json(tasks);
  } catch (error: any) {
    console.error("GET /api/tasks:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const { title, description, priority, xp, coins, category_id, due_date, due_time } = req.body;

    if (!title?.trim()) {
      return apiError(res, 400, "Task title is required");
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, xp_reward, coin_reward, category_id, due_date, due_time, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      capStr(title, 200),
      description ? capStr(description, 1000) : null,
      capNum(priority, 1, 4),
      capNum(xp, 0, 1000),
      capNum(coins, 0, 1000),
      category_id ? capNum(category_id, 1) : null,
      due_date ? capStr(due_date, 10) : null,
      due_time ? capStr(due_time, 8) : null,
      new Date().toISOString()
    );

    logEvent("task_created", { task_id: result.lastInsertRowid, title });

    res.json({ 
      task_id: result.lastInsertRowid,
      title: capStr(title, 200),
      message: "Task created successfully"
    });
  } catch (error: any) {
    console.error("POST /api/tasks:", error);
    apiError(res, 500, error.message);
  }
});

app.patch("/api/tasks/:id", (req, res) => {
  try {
    const taskId = safeInt(req.params.id);
    const updates = req.body;

    if (!taskId) {
      return apiError(res, 400, "Invalid task ID");
    }

    const allowedFields = ["title", "description", "priority", "xp_reward", "coin_reward", "category_id", "due_date", "due_time"];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = ?`);
        
        if (key === "title") {
          values.push(capStr(value, 200));
        } else if (key === "description") {
          values.push(value ? capStr(value, 1000) : null);
        } else if (["priority", "xp_reward", "coin_reward", "category_id"].includes(key)) {
          values.push(value ? capNum(value) : null);
        } else {
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return apiError(res, 400, "No valid fields to update");
    }

    values.push(taskId);
    const stmt = db.prepare(`UPDATE tasks SET ${setClauses.join(", ")} WHERE task_id = ? AND is_active = 1`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return apiError(res, 404, "Task not found");
    }

    logEvent("task_updated", { task_id: taskId, fields: Object.keys(updates) });

    res.json({ message: "Task updated successfully" });
  } catch (error: any) {
    console.error("PATCH /api/tasks/:id:", error);
    apiError(res, 500, error.message);
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const taskId = safeInt(req.params.id);

    if (!taskId) {
      return apiError(res, 400, "Invalid task ID");
    }

    const stmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ? AND is_active = 1");
    const result = stmt.run(taskId);

    if (result.changes === 0) {
      return apiError(res, 404, "Task not found");
    }

    logEvent("task_deleted", { task_id: taskId });

    res.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/tasks/:id:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// COMPLETIONS API
// ============================================================================

app.post("/api/tasks/:id/complete", (req, res) => {
  try {
    const taskId = safeInt(req.params.id);
    const { note } = req.body;

    if (!taskId) {
      return apiError(res, 400, "Invalid task ID");
    }

    // Get task details first
    const taskStmt = db.prepare("SELECT * FROM tasks WHERE task_id = ? AND is_active = 1");
    const task = taskStmt.get(taskId);

    if (!task) {
      return apiError(res, 404, "Task not found");
    }

    // Create completion record
    const completionStmt = db.prepare(`
      INSERT INTO task_completions (task_id, xp_earned, coins_earned, note, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const completionResult = completionStmt.run(
      taskId,
      task.xp_reward || 0,
      task.coin_reward || 0,
      note ? capStr(note, 500) : null,
      new Date().toISOString()
    );

    // Soft delete the task
    const deleteStmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ?");
    deleteStmt.run(taskId);

    logEvent("task_completed", { 
      task_id: taskId, 
      completion_id: completionResult.lastInsertRowid,
      xp: task.xp_reward,
      coins: task.coin_reward
    });

    res.json({
      ok: true,
      completion_id: completionResult.lastInsertRowid,
      earned_xp: task.xp_reward || 0,
      earned_coins: task.coin_reward || 0,
      message: "Task completed successfully!"
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
    const { category } = req.query;
    
    let sql = "SELECT * FROM checklists WHERE 1=1";
    const params: any[] = [];

    if (category && String(category).trim()) {
      sql += " AND category = ?";
      params.push(String(category).trim());
    }

    sql += " ORDER BY created_at DESC";

    const stmt = db.prepare(sql);
    const checklists = stmt.all(...params);

    // Get items for each checklist
    const itemsStmt = db.prepare("SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC, item_id ASC");
    
    const result = checklists.map(checklist => ({
      ...checklist,
      items: itemsStmt.all(checklist.checklist_id)
    }));

    res.json(result);
  } catch (error: any) {
    console.error("GET /api/checklists:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/checklists", (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name?.trim()) {
      return apiError(res, 400, "Checklist name is required");
    }

    const stmt = db.prepare(`
      INSERT INTO checklists (name, category, created_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      capStr(name, 200),
      category ? capStr(category, 100) : null,
      new Date().toISOString()
    );

    logEvent("checklist_created", { checklist_id: result.lastInsertRowid, name });

    res.json({
      checklist_id: result.lastInsertRowid,
      name: capStr(name, 200),
      category: category ? capStr(category, 100) : null,
      message: "Checklist created successfully"
    });
  } catch (error: any) {
    console.error("POST /api/checklists:", error);
    apiError(res, 500, error.message);
  }
});

app.post("/api/checklists/:id/items", (req, res) => {
  try {
    const checklistId = safeInt(req.params.id);
    const { text, position } = req.body;

    if (!checklistId) {
      return apiError(res, 400, "Invalid checklist ID");
    }

    if (!text?.trim()) {
      return apiError(res, 400, "Item text is required");
    }

    const stmt = db.prepare(`
      INSERT INTO checklist_items (checklist_id, text, position, completed, created_at)
      VALUES (?, ?, ?, 0, ?)
    `);

    const result = stmt.run(
      checklistId,
      capStr(text, 500),
      position ? capNum(position, 0) : 0,
      new Date().toISOString()
    );

    logEvent("checklist_item_added", { 
      checklist_id: checklistId, 
      item_id: result.lastInsertRowid,
      text: capStr(text, 50) // Truncate for logging
    });

    res.json({
      item_id: result.lastInsertRowid,
      checklist_id: checklistId,
      text: capStr(text, 500),
      message: "Item added successfully"
    });
  } catch (error: any) {
    console.error("POST /api/checklists/:id/items:", error);
    apiError(res, 500, error.message);
  }
});

app.patch("/api/checklists/items/:id", (req, res) => {
  try {
    const itemId = safeInt(req.params.id);
    const { completed, text, position } = req.body;

    if (!itemId) {
      return apiError(res, 400, "Invalid item ID");
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (typeof completed === "boolean") {
      updates.push("completed = ?");
      values.push(completed ? 1 : 0);
    }

    if (text !== undefined) {
      updates.push("text = ?");
      values.push(capStr(text, 500));
    }

    if (position !== undefined) {
      updates.push("position = ?");
      values.push(capNum(position, 0));
    }

    if (updates.length === 0) {
      return apiError(res, 400, "No valid fields to update");
    }

    values.push(itemId);
    const stmt = db.prepare(`UPDATE checklist_items SET ${updates.join(", ")} WHERE item_id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return apiError(res, 404, "Item not found");
    }

    logEvent("checklist_item_updated", { item_id: itemId, fields: Object.keys(req.body) });

    res.json({ message: "Item updated successfully" });
  } catch (error: any) {
    console.error("PATCH /api/checklists/items/:id:", error);
    apiError(res, 500, error.message);
  }
});

// ============================================================================
// JOURNAL API
// ============================================================================

app.post("/api/journal", (req, res) => {
  try {
    const { text, mood, energy, stress, tags } = req.body;

    if (!text?.trim()) {
      return apiError(res, 400, "Journal text is required");
    }

    const stmt = db.prepare(`
      INSERT INTO journal_entries (text, mood, energy, stress, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      capStr(text, 5000),
      mood !== undefined ? capNum(mood, 1, 10) : null,
      energy !== undefined ? capNum(energy, 1, 10) : null,
      stress !== undefined ? capNum(stress, 1, 10) : null,
      tags ? capStr(tags, 200) : null,
      new Date().toISOString()
    );

    logEvent("journal_entry_created", { 
      entry_id: result.lastInsertRowid,
      mood, energy, stress,
      text_length: text.length
    });

    res.json({
      entry_id: result.lastInsertRowid,
      text: capStr(text, 5000),
      message: "Journal entry saved successfully"
    });
  } catch (error: any) {
    console.error("POST /api/journal:", error);
    apiError(res, 500, error.message);
  }
});

app.get("/api/journal/recent", (req, res) => {
  try {
    const { from, to } = req.query;
    
    let sql = "SELECT * FROM journal_entries";
    const params: any[] = [];
    const conditions: string[] = [];

    if (from) {
      conditions.push("created_at >= ?");
      params.push(String(from));
    }
    if (to) {
      conditions.push("created_at <= ?");
      params.push(String(to));
    }

    if (conditions.length > 0) {
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
    const { chatOnce, buildSystemPrompt } = await import("./adapter_lm.js");
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
      const { chatStream, buildSystemPrompt } = await import("./adapter_lm.js");
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
// TOOLS API
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

    // Use the tools module
    const result = await executeTool(name, args);
    
    if (result.ok) {
      res.json(result);
    } else {
      // Return error details but with 200 status so ChatPage can handle it properly
      res.json(result);
    }
  } catch (error: any) {
    console.error("POST /api/tools/exec:", error);
    res.json({ ok: false, error: "Tool execution failed", details: error.message });
  }
});

// ============================================================================
// EXPORT/ADMIN API
// ============================================================================

app.get("/api/admin/export/tasks", (req, res) => {
  try {
    const { format } = req.query;
    
    const tasks = db.prepare("SELECT * FROM tasks WHERE is_active = 1 ORDER BY priority DESC, created_at DESC").all();
    
    if (format === "csv") {
      let csv = "task_id,title,description,priority,xp_reward,coin_reward,category_id,created_at,due_date,due_time\n";
      tasks.forEach((task: any) => {
        csv += `${task.task_id},"${(task.title || '').replace(/"/g, '""')}","${(task.description || '').replace(/"/g, '""')}",${task.priority},${task.xp_reward},${task.coin_reward},${task.category_id || ''},${task.created_at},${task.due_date || ''},${task.due_time || ''}\n`;
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(csv);
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
    const { format } = req.query;
    
    const checklists = db.prepare("SELECT * FROM checklists ORDER BY created_at DESC").all();
    const itemsStmt = db.prepare("SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC, item_id ASC");
    
    const result = checklists.map((checklist: any) => {
      const items = itemsStmt.all(checklist.checklist_id);
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

// Add this near the end of server.ts, before the server startup section:

// ============================================================================
// HEALTH/STATUS ENDPOINTS
// ============================================================================

app.get("/api/admin/health", (req, res) => {
  try {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected"
    });
  } catch (error: any) {
    console.error("GET /api/admin/health:", error);
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