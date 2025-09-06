// fastify-server.ts - Modern Fastify backend
import Fastify from 'fastify';
import cors from '@fastify/cors';
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

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8002; // Temporary port during migration

// ============================================================================
// PLUGINS & MIDDLEWARE
// ============================================================================

// CORS plugin
await fastify.register(cors, {
  origin: true,
  credentials: true
});

// Static file serving
await fastify.register(import('@fastify/static'), {
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

// ============================================================================
// TASKS API - Modern Fastify style
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
        category_id: { type: 'string' } // Can be number or "null"
      }
    }
  }
}, async (request, reply) => {
  try {
    const { q, priority, sort, category_id } = request.query as any;
    
    let sql = "SELECT task_id, title, description, priority, xp_reward as xp, coin_reward as coins, category_id, created_at, due_date, due_time FROM tasks WHERE is_active = 1";
    const params: any[] = [];

    // Search filter
    if (q?.trim()) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      const search = `%${q.trim()}%`;
      params.push(search, search);
    }

    // Priority filter
    if (priority) {
      sql += " AND priority = ?";
      params.push(priority);
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
    const sortClause = sortMap[sort || ''] || "priority DESC, created_at DESC";
    sql += ` ORDER BY ${sortClause}`;

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
    if (error.statusCode) throw error; // Re-throw HTTP errors
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
      task.xp_reward || 0,
      task.coin_reward || 0,
      note || null,
      new Date().toISOString()
    );

    // Soft delete the task
    const deleteStmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ?");
    deleteStmt.run(id);

    logEvent("task_completed", { 
      task_id: id, 
      completion_id: completionResult.lastInsertRowid,
      xp: task.xp_reward,
      coins: task.coin_reward
    });

    return {
      ok: true,
      completion_id: completionResult.lastInsertRowid,
      earned_xp: task.xp_reward || 0,
      earned_coins: task.coin_reward || 0,
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

    const result = stmt.run(
      name,
      category || null,
      new Date().toISOString()
    );

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

    const result = stmt.run(
      checklistId,
      text,
      position,
      new Date().toISOString()
    );

    logEvent("checklist_item_added", { 
      checklist_id: checklistId, 
      item_id: result.lastInsertRowid,
      text: text.substring(0, 50) // Truncate for logging
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
    const { completed, text, position } = request.body as any;

    const updates: string[] = [];
    const values: any[] = [];

    if (typeof completed === "boolean") {
      updates.push("completed = ?");
      values.push(completed ? 1 : 0);
    }

    if (text !== undefined) {
      updates.push("text = ?");
      values.push(text);
    }

    if (position !== undefined) {
      updates.push("position = ?");
      values.push(position);
    }

    if (updates.length === 0) {
      throw fastify.httpErrors.badRequest("No valid fields to update");
    }

    values.push(itemId);
    const stmt = db.prepare(`UPDATE checklist_items SET ${updates.join(", ")} WHERE item_id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw fastify.httpErrors.notFound("Item not found");
    }

    logEvent("checklist_item_updated", { item_id: itemId, fields: Object.keys(request.body) });

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
    
    let sql = "SELECT * FROM journal_entries";
    const params: any[] = [];
    const conditions: string[] = [];

    if (from) {
      conditions.push("created_at >= ?");
      params.push(from);
    }
    if (to) {
      conditions.push("created_at <= ?");
      params.push(to);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
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
// HEALTH CHECK
// ============================================================================

fastify.get('/api/admin/health', async (request, reply) => {
  return { 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "connected",
    server: "fastify"
  };
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '127.0.0.1' });
    console.log(`🚀 Fastify server running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Database: ./app.db (${db.pragma("journal_mode", { simple: true })})`);
    
    logEvent("fastify_server_start", { 
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