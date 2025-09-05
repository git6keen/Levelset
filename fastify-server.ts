// FILE: fastify-server-drizzle.ts - Modern Fastify backend with Drizzle ORM
import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as fs from 'fs';
import * as path from 'path';
import { logEvent, getEvents } from './trace.js';
import { executeTool } from './tools.js';
import { db, rawDb, getDatabaseInfo, completeTaskTransaction } from './db.js';
import { schema } from './schema.js';
import { eq, desc, asc, and, or, like, isNull, isNotNull } from 'drizzle-orm';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8002;

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
// TASKS API - Now with Drizzle ORM magic!
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
    
    // Start with base query - look at this beautiful type safety!
    let query = db.select({
      task_id: schema.tasks.task_id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      priority: schema.tasks.priority,
      xp: schema.tasks.xp_reward,
      coins: schema.tasks.coin_reward,
      category_id: schema.tasks.category_id,
      created_at: schema.tasks.created_at,
      due_date: schema.tasks.due_date,
      due_time: schema.tasks.due_time
    }).from(schema.tasks);

    // Build WHERE conditions
    const conditions = [eq(schema.tasks.is_active, true)];

    // Search filter - no SQL injection possible!
    if (q?.trim()) {
      conditions.push(
        or(
          like(schema.tasks.title, `%${q.trim()}%`),
          like(schema.tasks.description, `%${q.trim()}%`)
        )!
      );
    }

    // Priority filter
    if (priority) {
      conditions.push(eq(schema.tasks.priority, priority));
    }

    // Category filter
    if (category_id !== undefined) {
      if (category_id === "" || category_id === "null") {
        conditions.push(isNull(schema.tasks.category_id));
      } else if (!isNaN(Number(category_id))) {
        conditions.push(eq(schema.tasks.category_id, Number(category_id)));
      }
    }

    // Apply WHERE conditions
    query = query.where(and(...conditions));

    // Apply sorting - TypeScript knows these are valid columns!
    switch (sort) {
      case 'priority':
        query = query.orderBy(desc(schema.tasks.priority), desc(schema.tasks.created_at));
        break;
      case 'title':
        query = query.orderBy(asc(schema.tasks.title));
        break;
      case 'created_at':
        query = query.orderBy(desc(schema.tasks.created_at));
        break;
      default:
        query = query.orderBy(desc(schema.tasks.priority), desc(schema.tasks.created_at));
    }

    // Execute with full type safety
    const tasks = await query;
    
    return tasks; // TypeScript knows this is exactly the right type!
    
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

    // Insert with Drizzle - type-safe and beautiful!
    const result = await db.insert(schema.tasks).values({
      title,
      description: description || null,
      priority,
      xp_reward: xp,
      coin_reward: coins,
      category_id: category_id || null,
      due_date: due_date || null,
      due_time: due_time || null,
      created_at: new Date().toISOString(),
      is_active: true
    }).returning();

    const task = result[0];
    logEvent("task_created", { task_id: task.task_id, title });

    return { 
      task_id: task.task_id,
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

    // Drizzle update - only updates provided fields
    const result = await db.update(schema.tasks)
      .set(updates)
      .where(and(
        eq(schema.tasks.task_id, id),
        eq(schema.tasks.is_active, true)
      ));

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

    // Soft delete with Drizzle
    const result = await db.update(schema.tasks)
      .set({ is_active: false })
      .where(and(
        eq(schema.tasks.task_id, id),
        eq(schema.tasks.is_active, true)
      ));

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
// TASK COMPLETIONS API - Using our transaction helper!
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

    // Use our atomic transaction helper - bulletproof!
    const result = completeTaskTransaction(id, note);

    logEvent("task_completed", { 
      task_id: id, 
      completion_id: result.completion.completion_id,
      xp: result.earned_xp,
      coins: result.earned_coins
    });

    return {
      ok: true,
      completion_id: result.completion.completion_id,
      earned_xp: result.earned_xp,
      earned_coins: result.earned_coins,
      message: "Task completed successfully!"
    };
  } catch (error: any) {
    if (error.message === 'Task not found') {
      throw fastify.httpErrors.notFound("Task not found");
    }
    fastify.log.error('POST /api/tasks/:id/complete error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// CHECKLISTS API - Drizzle style!
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
    
    // Build query with optional category filter
    let checklistsQuery = db.select().from(schema.checklists);
    
    if (category?.trim()) {
      checklistsQuery = checklistsQuery.where(eq(schema.checklists.category, category.trim()));
    }
    
    checklistsQuery = checklistsQuery.orderBy(desc(schema.checklists.created_at));
    
    const checklists = await checklistsQuery;

    // Get items for each checklist using a single query
    const allItems = await db.select()
      .from(schema.checklistItems)
      .orderBy(asc(schema.checklistItems.position), asc(schema.checklistItems.item_id));
    
    // Group items by checklist
    const result = checklists.map(checklist => ({
      ...checklist,
      items: allItems.filter(item => item.checklist_id === checklist.checklist_id)
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

    const result = await db.insert(schema.checklists).values({
      name,
      category: category || null,
      created_at: new Date().toISOString()
    }).returning();

    const checklist = result[0];
    logEvent("checklist_created", { checklist_id: checklist.checklist_id, name });

    return {
      checklist_id: checklist.checklist_id,
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

    const result = await db.insert(schema.checklistItems).values({
      checklist_id: checklistId,
      text,
      position,
      completed: false,
      created_at: new Date().toISOString()
    }).returning();

    const item = result[0];
    logEvent("checklist_item_added", { 
      checklist_id: checklistId, 
      item_id: item.item_id,
      text: text.substring(0, 50)
    });

    return {
      item_id: item.item_id,
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

    const result = await db.update(schema.checklistItems)
      .set(updates)
      .where(eq(schema.checklistItems.item_id, itemId));

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
// JOURNAL API - Type-safe journaling!
// ============================================================================

// POST /api/journal
fastify.post('/api/journal', {
  schema: {
    body: JournalSchema
  }
}, async (request, reply) => {
  try {
    const { text, mood, energy, stress, tags } = request.body as any;

    const result = await db.insert(schema.journalEntries).values({
      text,
      mood: mood || null,
      energy: energy || null,
      stress: stress || null,
      tags: tags || null,
      created_at: new Date().toISOString()
    }).returning();

    const entry = result[0];
    logEvent("journal_entry_created", { 
      entry_id: entry.entry_id,
      mood, energy, stress,
      text_length: text.length
    });

    return {
      entry_id: entry.entry_id,
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
    
    let query = db.select().from(schema.journalEntries);
    const conditions = [];

    if (from) {
      // In a real app, you'd use proper date comparison
      conditions.push(like(schema.journalEntries.created_at, `${from}%`));
    }
    if (to) {
      conditions.push(like(schema.journalEntries.created_at, `${to}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query
      .orderBy(desc(schema.journalEntries.created_at))
      .limit(100);
    
    return { rows };
  } catch (error: any) {
    fastify.log.error('GET /api/journal/recent error:', error);
    throw fastify.httpErrors.internalServerError(error.message);
  }
});

// ============================================================================
// CHAT/AI API
// ============================================================================

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
    
    const tasks = await db.select()
      .from(schema.tasks)
      .where(eq(schema.tasks.is_active, true))
      .orderBy(desc(schema.tasks.priority), desc(schema.tasks.created_at));
    
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
// HEALTH CHECK - Now with Drizzle database info!
// ============================================================================

fastify.get('/api/admin/health', async (request, reply) => {
  try {
    const dbInfo = getDatabaseInfo();
    return { 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      server: "fastify-drizzle",
      db: dbInfo
    };
  } catch (error: any) {
    return {
      status: "error",
      timestamp: new Date().toISOString(),
      database: "error",
      server: "fastify-drizzle",
      error: error.message
    };
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '127.0.0.1' });
    console.log(`🚀 Fastify + Drizzle server running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Database: ./app.db (${getDatabaseInfo().journal_mode})`);
    console.log(`🛡️  Type-safe queries: ENABLED`);
    
    logEvent("fastify_drizzle_server_start", { 
      port: PORT, 
      db_info: getDatabaseInfo(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();