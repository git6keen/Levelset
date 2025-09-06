// FILE: fastify-server.ts - Modern Fastify backend with ESM fixes
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import staticPlugin from '@fastify/static';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { logEvent, getEvents } from './trace.js';
import { executeTool } from './tools.js';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Database setup
const db = new Database('./app.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8002;

// ============================================================================
// PLUGINS & MIDDLEWARE
// ============================================================================

// Register sensible plugin for httpErrors support
await fastify.register(sensible);

// CORS plugin with full method support
await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// Static file serving
await fastify.register(staticPlugin, {
  root: process.cwd(),
  prefix: '/'
});

// ============================================================================
// SCHEMAS - Type-safe validation
// ============================================================================

const TaskSchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', maxLength: 1000 },
    priority: { type: 'integer', minimum: 1, maximum: 4 },
    xp: { type: 'integer', minimum: 0, maximum: 1000 },
    coins: { type: 'integer', minimum: 0, maximum: 1000 },
    category_id: { type: 'integer', minimum: 1 },
    due_date: { type: 'string', format: 'date' },
    due_time: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
  }
} as const;

const JournalSchema = {
  type: 'object',
  required: ['text'],
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 5000 },
    mood: { type: 'integer', minimum: 1, maximum: 10 },
    energy: { type: 'integer', minimum: 1, maximum: 10 },
    stress: { type: 'integer', minimum: 1, maximum: 10 },
    tags: { type: 'string', maxLength: 200 }
  }
} as const;

const ChecklistSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 200 },
    category: { type: 'string', maxLength: 100 }
  }
} as const;

const ChecklistItemSchema = {
  type: 'object',
  required: ['text'],
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500 },
    position: { type: 'integer', minimum: 0 }
  }
} as const;

const ChatSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string', minLength: 1, maxLength: 10000 },
    agent: { type: 'string', enum: ['Assistant', 'Kraken'], default: 'Assistant' },
    model: { type: 'string', default: 'lmstudio' },
    context: { type: 'string', maxLength: 5000 },
    lmBase: { type: 'string', format: 'uri', default: 'http://127.0.0.1:1234' }
  }
} as const;

// ============================================================================
// TASKS API
// ============================================================================

// GET /api/tasks
fastify.get('/api/tasks', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        q: { type: 'string' },
        priority: { type: 'integer', minimum: 1, maximum: 4 },
        sort: { type: 'string', enum: ['priority', 'title', 'created_at'] },
        category_id: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { q, priority, sort, category_id } = request.query as any;
    
    let sql = "SELECT task_id, title, description, priority, xp_reward as xp, coin_reward as coins, category_id, created_at, due_date, due_time FROM tasks WHERE is_active = 1";
    const params: any[] = [];

    if (q?.trim()) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      const searchTerm = `%${q.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    if (priority) {
      sql += " AND priority = ?";
      params.push(priority);
    }

    if (category_id !== undefined) {
      if (category_id === "" || category_id === "null") {
        sql += " AND category_id IS NULL";
      } else if (!isNaN(Number(category_id))) {
        sql += " AND category_id = ?";
        params.push(Number(category_id));
      }
    }

    // Apply sorting
    switch (sort) {
      case 'priority':
        sql += " ORDER BY priority DESC, created_at DESC";
        break;
      case 'title':
        sql += " ORDER BY title ASC";
        break;
      case 'created_at':
        sql += " ORDER BY created_at DESC";
        break;
      default:
        sql += " ORDER BY priority DESC, created_at DESC";
    }

    const stmt = db.prepare(sql);
    const tasks = stmt.all(...params);
    
    return tasks;
    
  } catch (error: any) {
    fastify.log.error('GET /api/tasks error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// POST /api/tasks
fastify.post('/api/tasks', {
  schema: {
    body: TaskSchema
  }
}, async (request, reply) => {
  try {
    const { title, description, priority = 2, xp = 0, coins = 0, category_id, due_date, due_time } = request.body as any;

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, xp_reward, coin_reward, category_id, due_date, due_time, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const result = stmt.run(
      title,
      description || null,
      priority,
      xp,
      coins,
      category_id || null,
      due_date || null,
      due_time || null,
      new Date().toISOString()
    );

    logEvent("task_created", { task_id: result.lastInsertRowid, title });

    return { 
      task_id: result.lastInsertRowid,
      title,
      message: "Task created successfully"
    };
  } catch (error: any) {
    fastify.log.error('POST /api/tasks error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// PATCH /api/tasks/:id
fastify.patch('/api/tasks/:id', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    },
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 1000 },
        priority: { type: 'integer', minimum: 1, maximum: 4 },
        xp_reward: { type: 'integer', minimum: 0, maximum: 1000 },
        coin_reward: { type: 'integer', minimum: 0, maximum: 1000 },
        category_id: { type: 'integer', minimum: 1 },
        due_date: { type: 'string', format: 'date' },
        due_time: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { id } = request.params as any;
    const updates = request.body as any;

    const allowedFields = ["title", "description", "priority", "xp_reward", "coin_reward", "category_id", "due_date", "due_time"];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      throw fastify.httpErrors.badRequest("No valid fields to update");
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE tasks SET ${setClauses.join(", ")} WHERE task_id = ? AND is_active = 1`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw fastify.httpErrors.notFound("Task not found");
    }

    logEvent("task_updated", { task_id: id, fields: Object.keys(updates) });

    return { message: "Task updated successfully" };
  } catch (error: any) {
    if (error.statusCode) throw error;
    fastify.log.error('PATCH /api/tasks/:id error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// DELETE /api/tasks/:id
fastify.delete('/api/tasks/:id', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { id } = request.params as any;

    const stmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ? AND is_active = 1");
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw fastify.httpErrors.notFound("Task not found");
    }

    logEvent("task_deleted", { task_id: id });

    return { message: "Task deleted successfully" };
  } catch (error: any) {
    if (error.statusCode) throw error;
    fastify.log.error('DELETE /api/tasks/:id error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// TASK COMPLETIONS API
// ============================================================================

// POST /api/tasks/:id/complete
fastify.post('/api/tasks/:id/complete', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    },
    body: {
      type: 'object',
      properties: {
        note: { type: 'string', maxLength: 500 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { id } = request.params as any;
    const { note } = request.body as any;

    // Get task details first
    const taskStmt = db.prepare("SELECT * FROM tasks WHERE task_id = ? AND is_active = 1");
    const task = taskStmt.get(id);

    if (!task) {
      throw fastify.httpErrors.notFound("Task not found");
    }

    // Create completion record
    const completionStmt = db.prepare(`
      INSERT INTO task_completions (task_id, xp_earned, coins_earned, note, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const completionResult = completionStmt.run(
      id,
      (task as any).xp_reward || 0,
      (task as any).coin_reward || 0,
      note || null,
      new Date().toISOString()
    );

    // Soft delete the task
    const deleteStmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ?");
    deleteStmt.run(id);

    logEvent("task_completed", { 
      task_id: id, 
      completion_id: completionResult.lastInsertRowid,
      xp: (task as any).xp_reward,
      coins: (task as any).coin_reward
    });

    return {
      ok: true,
      completion_id: completionResult.lastInsertRowid,
      earned_xp: (task as any).xp_reward || 0,
      earned_coins: (task as any).coin_reward || 0,
      message: "Task completed successfully!"
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    fastify.log.error('POST /api/tasks/:id/complete error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// CHECKLISTS API
// ============================================================================

// GET /api/checklists
fastify.get('/api/checklists', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        category: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { category } = request.query as any;
    
    let sql = "SELECT * FROM checklists WHERE 1=1";
    const params: any[] = [];

    if (category?.trim()) {
      sql += " AND category = ?";
      params.push(category.trim());
    }

    sql += " ORDER BY created_at DESC";

    const stmt = db.prepare(sql);
    const checklists = stmt.all(...params);

    // Get items for each checklist
    const itemsStmt = db.prepare("SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position ASC, item_id ASC");
    
    const result = checklists.map(checklist => ({
      ...checklist,
      items: itemsStmt.all((checklist as any).checklist_id)
    }));

    return result;
  } catch (error: any) {
    fastify.log.error('GET /api/checklists error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// POST /api/checklists
fastify.post('/api/checklists', {
  schema: {
    body: ChecklistSchema
  }
}, async (request, reply) => {
  try {
    const { name, category } = request.body as any;

    const stmt = db.prepare(`
      INSERT INTO checklists (name, category, created_at)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(name, category || null, new Date().toISOString());

    logEvent("checklist_created", { checklist_id: result.lastInsertRowid, name });

    return {
      checklist_id: result.lastInsertRowid,
      name,
      category: category || null,
      message: "Checklist created successfully"
    };
  } catch (error: any) {
    fastify.log.error('POST /api/checklists error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// POST /api/checklists/:id/items
fastify.post('/api/checklists/:id/items', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    },
    body: ChecklistItemSchema
  }
}, async (request, reply) => {
  try {
    const { id: checklistId } = request.params as any;
    const { text, position = 0 } = request.body as any;

    const stmt = db.prepare(`
      INSERT INTO checklist_items (checklist_id, text, position, completed, created_at)
      VALUES (?, ?, ?, 0, ?)
    `);
    
    const result = stmt.run(checklistId, text, position, new Date().toISOString());

    logEvent("checklist_item_added", { 
      checklist_id: checklistId, 
      item_id: result.lastInsertRowid,
      text: text.substring(0, 50)
    });

    return {
      item_id: result.lastInsertRowid,
      checklist_id: checklistId,
      text,
      message: "Item added successfully"
    };
  } catch (error: any) {
    fastify.log.error('POST /api/checklists/:id/items error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// PATCH /api/checklists/items/:id
fastify.patch('/api/checklists/items/:id', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', minimum: 1 }
      }
    },
    body: {
      type: 'object',
      properties: {
        completed: { type: 'boolean' },
        text: { type: 'string', minLength: 1, maxLength: 500 },
        position: { type: 'integer', minimum: 0 }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { id: itemId } = request.params as any;
    const updates = request.body as any;

    const allowedFields = ["text", "position", "completed"];
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      throw fastify.httpErrors.badRequest("No valid fields to update");
    }

    values.push(itemId);
    const stmt = db.prepare(`UPDATE checklist_items SET ${setClauses.join(", ")} WHERE item_id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw fastify.httpErrors.notFound("Item not found");
    }

    logEvent("checklist_item_updated", { item_id: itemId, fields: Object.keys(updates) });

    return { message: "Item updated successfully" };
  } catch (error: any) {
    if (error.statusCode) throw error;
    fastify.log.error('PATCH /api/checklists/items/:id error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// JOURNAL API
// ============================================================================

// POST /api/journal
fastify.post('/api/journal', {
  schema: {
    body: JournalSchema
  }
}, async (request, reply) => {
  try {
    const { text, mood, energy, stress, tags } = request.body as any;

    const stmt = db.prepare(`
      INSERT INTO journal_entries (text, mood, energy, stress, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      text,
      mood || null,
      energy || null,
      stress || null,
      tags || null,
      new Date().toISOString()
    );

    logEvent("journal_entry_created", { 
      entry_id: result.lastInsertRowid,
      mood, energy, stress,
      text_length: text.length
    });

    return {
      entry_id: result.lastInsertRowid,
      text,
      message: "Journal entry saved successfully"
    };
  } catch (error: any) {
    fastify.log.error('POST /api/journal error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// GET /api/journal/recent
fastify.get('/api/journal/recent', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        from: { type: 'string' },
        to: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { from, to } = request.query as any;
    
    let sql = "SELECT * FROM journal_entries WHERE 1=1";
    const params: any[] = [];

    if (from) {
      sql += " AND created_at >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND created_at <= ?";
      params.push(to);
    }

    sql += " ORDER BY created_at DESC LIMIT 100";

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    
    return { rows };
  } catch (error: any) {
    fastify.log.error('GET /api/journal/recent error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// CHAT/AI API
// ============================================================================

// POST /api/chat
fastify.post('/api/chat', {
  schema: {
    body: ChatSchema
  }
}, async (request, reply) => {
  try {
    const { message, agent = "Assistant", model = "lmstudio", context = "", lmBase = "http://127.0.0.1:1234" } = request.body as any;

    logEvent("chat_request", { agent, model, message: message.substring(0, 100) });

    const { chatOnce, buildSystemPrompt } = await import("./adapter_lm.js");
    const systemPrompt = buildSystemPrompt(agent, context);

    try {
      const reply_text = await chatOnce({
        message: message.trim(),
        system: systemPrompt,
        model,
        baseUrl: lmBase,
        temperature: 0.7,
        max_tokens: 2000,
      });

      return { reply: reply_text };
    } catch (error: any) {
      fastify.log.error("LM chat error:", error);
      return { reply: `Error: ${error.message || "Failed to get response from language model"}` };
    }
  } catch (error: any) {
    fastify.log.error('POST /api/chat error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// GET /api/chat/stream
fastify.get('/api/chat/stream', {
  schema: {
    querystring: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', minLength: 1 },
        agent: { type: 'string', enum: ['Assistant', 'Kraken'] },
        model: { type: 'string' },
        context: { type: 'string' },
        lmBase: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { message, agent = "Assistant", model = "lmstudio", context = "", lmBase = "http://127.0.0.1:1234" } = request.query as any;

    if (!message?.trim()) {
      throw fastify.httpErrors.badRequest("Message is required");
    }

    logEvent("chat_stream_request", { agent, model, message: message.substring(0, 100) });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    try {
      const { chatStream, buildSystemPrompt } = await import("./adapter_lm.js");
      const systemPrompt = buildSystemPrompt(agent, context);

      await chatStream({
        message: message.trim(),
        system: systemPrompt,
        model,
        baseUrl: lmBase,
        temperature: 0.7,
        max_tokens: 2000,
        onChunk: (chunk: string) => {
          reply.raw.write(`data: ${chunk}\n\n`);
        },
      });

      reply.raw.write("data: [[END]]\n\n");
      reply.raw.end();
    } catch (error: any) {
      fastify.log.error("LM stream error:", error);
      reply.raw.write(`data: [ERROR] ${error.message || "Stream failed"}\n\n`);
      reply.raw.write("data: [[END]]\n\n");
      reply.raw.end();
    }
  } catch (error: any) {
    fastify.log.error('GET /api/chat/stream error:', error);
    if (!reply.raw.headersSent) {
      throw fastify.httpErrors.internalServerError(error.message);
    }
  }
});

// ============================================================================
// TOOLS API
// ============================================================================

const ToolExecutionSchema = {
  type: 'object',
  required: ['name', 'args'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    args: { type: 'object' }
  }
} as const;

// POST /api/tools/exec
fastify.post('/api/tools/exec', {
  schema: {
    body: ToolExecutionSchema
  }
}, async (request, reply) => {
  try {
    const { name, args } = request.body as any;

    logEvent("tool_exec", { name, args });

    const result = await executeTool(name, args);
    return result;
  } catch (error: any) {
    fastify.log.error('POST /api/tools/exec error:', error);
    return { 
      ok: false, 
      error: "Tool execution failed", 
      details: error.message 
    };
  }
});

// ============================================================================
// ADMIN/EXPORT API
// ============================================================================

// GET /api/admin/export/tasks
fastify.get('/api/admin/export/tasks', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'csv'] }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { format } = request.query as any;
    
    const stmt = db.prepare(`
      SELECT task_id, title, description, priority, xp_reward, coin_reward, category_id, created_at, due_date, due_time
      FROM tasks 
      WHERE is_active = 1 
      ORDER BY priority DESC, created_at DESC
    `);
    const tasks = stmt.all();
    
    if (format === "csv") {
      let csv = "task_id,title,description,priority,xp_reward,coin_reward,category_id,created_at,due_date,due_time\n";
      tasks.forEach((task: any) => {
        csv += `${task.task_id},"${(task.title || '').replace(/"/g, '""')}","${(task.description || '').replace(/"/g, '""')}",${task.priority},${task.xp_reward},${task.coin_reward},${task.category_id || ''},${task.created_at},${task.due_date || ''},${task.due_time || ''}\n`;
      });
      
      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", `attachment; filename="tasks-${new Date().toISOString().slice(0,10)}.csv"`);
      return csv;
    } else {
      return tasks;
    }
  } catch (error: any) {
    fastify.log.error('GET /api/admin/export/tasks error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// GET /api/admin/export/journal
fastify.get('/api/admin/export/journal', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['json', 'csv'] }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { format } = request.query as any;
    
    const stmt = db.prepare("SELECT * FROM journal_entries ORDER BY created_at DESC");
    const entries = stmt.all();
    
    if (format === "csv") {
      let csv = "entry_id,text,mood,energy,stress,tags,created_at\n";
      entries.forEach((entry: any) => {
        csv += `${entry.entry_id},"${(entry.text || '').replace(/"/g, '""')}",${entry.mood || ''},${entry.energy || ''},${entry.stress || ''},"${(entry.tags || '').replace(/"/g, '""')}",${entry.created_at}\n`;
      });
      
      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", `attachment; filename="journal-${new Date().toISOString().slice(0,10)}.csv"`);
      return csv;
    } else {
      return entries;
    }
  } catch (error: any) {
    fastify.log.error('GET /api/admin/export/journal error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// POST /api/admin/vacuum
fastify.post('/api/admin/vacuum', async (request, reply) => {
  try {
    db.pragma('vacuum');
    logEvent("database_vacuum", {});
    return { message: "Database vacuum completed" };
  } catch (error: any) {
    fastify.log.error('POST /api/admin/vacuum error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// POST /api/admin/reindex
fastify.post('/api/admin/reindex', async (request, reply) => {
  try {
    db.pragma('reindex');
    logEvent("database_reindex", {});
    return { message: "Database reindex completed" };
  } catch (error: any) {
    fastify.log.error('POST /api/admin/reindex error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// GET /api/trace
fastify.get('/api/trace', async (request, reply) => {
  try {
    const events = getEvents();
    return { events };
  } catch (error: any) {
    fastify.log.error('GET /api/trace error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// HEALTH CHECK & STATS
// ============================================================================

fastify.get('/api/admin/health', async (request, reply) => {
  try {
    const dbInfo = {
      journal_mode: db.pragma('journal_mode', { simple: true }),
      foreign_keys: db.pragma('foreign_keys', { simple: true }),
      wal: db.pragma('journal_mode', { simple: true }) === 'wal'
    };

    // Get some basic counts
    const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1").get() as any;
    const journalCount = db.prepare("SELECT COUNT(*) as count FROM journal_entries").get() as any;
    const checklistCount = db.prepare("SELECT COUNT(*) as count FROM checklists").get() as any;

    return { 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      server: "fastify-esm-fixed",
      db: dbInfo,
      counts: {
        tasks: taskCount?.count || 0,
        journal: journalCount?.count || 0,
        checklists: checklistCount?.count || 0
      }
    };
  } catch (error: any) {
    return {
      status: "error",
      timestamp: new Date().toISOString(),
      database: "error",
      server: "fastify-esm-fixed",
      error: error.message
    };
  }
});

// GET /api/admin/stats
fastify.get('/api/admin/stats', async (request, reply) => {
  try {
    const stats = {
      tasks: {
        total: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_active = 1").get(),
        by_priority: db.prepare("SELECT priority, COUNT(*) as count FROM tasks WHERE is_active = 1 GROUP BY priority ORDER BY priority").all(),
        completed_today: db.prepare("SELECT COUNT(*) as count FROM task_completions WHERE DATE(completed_at) = DATE('now')").get(),
        total_xp_earned: db.prepare("SELECT SUM(xp_earned) as total FROM task_completions").get(),
        total_coins_earned: db.prepare("SELECT SUM(coins_earned) as total FROM task_completions").get()
      },
      journal: {
        total_entries: db.prepare("SELECT COUNT(*) as count FROM journal_entries").get(),
        entries_this_week: db.prepare("SELECT COUNT(*) as count FROM journal_entries WHERE created_at >= datetime('now', '-7 days')").get(),
        avg_mood: db.prepare("SELECT AVG(mood) as avg FROM journal_entries WHERE mood IS NOT NULL").get(),
        avg_energy: db.prepare("SELECT AVG(energy) as avg FROM journal_entries WHERE energy IS NOT NULL").get(),
        avg_stress: db.prepare("SELECT AVG(stress) as avg FROM journal_entries WHERE stress IS NOT NULL").get()
      },
      checklists: {
        total: db.prepare("SELECT COUNT(*) as count FROM checklists").get(),
        total_items: db.prepare("SELECT COUNT(*) as count FROM checklist_items").get(),
        completed_items: db.prepare("SELECT COUNT(*) as count FROM checklist_items WHERE completed = 1").get()
      }
    };

    return stats;
  } catch (error: any) {
    fastify.log.error('GET /api/admin/stats error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '127.0.0.1' });
    console.log(`🚀 Fastify ESM server running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Database: ./app.db (${db.pragma("journal_mode", { simple: true })})`);
    console.log(`🛡️  Input validation: ENABLED`);
    console.log(`🌐 CORS: All methods enabled (including DELETE)`);
    console.log(`⚡ ESM modules: Properly loaded`);
    console.log(`🔧 HTTP errors: Available via @fastify/sensible`);
    
    logEvent("fastify_esm_server_start", { 
      port: PORT, 
      journal_mode: db.pragma("journal_mode", { simple: true }),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();