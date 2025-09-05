// FILE: db.ts - Drizzle database connection and utilities
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { schema } from './schema.js';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Create better-sqlite3 connection
const sqlite = new Database('./app.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export raw sqlite connection for advanced operations
export const rawDb = sqlite;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Execute raw SQL when needed (migrations, complex queries)
 */
export function execRaw(sql: string) {
  return sqlite.exec(sql);
}

/**
 * Get database info for health checks
 */
export function getDatabaseInfo() {
  const journalMode = sqlite.pragma('journal_mode', { simple: true });
  const foreignKeys = sqlite.pragma('foreign_keys', { simple: true });
  
  return {
    journal_mode: journalMode,
    foreign_keys: foreignKeys,
    wal: journalMode === 'wal'
  };
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase() {
  sqlite.close();
}

// ============================================================================
// QUERY BUILDERS (Type-safe convenience functions)
// ============================================================================

import { eq, desc, asc, and, or, like, isNull, isNotNull } from 'drizzle-orm';

/**
 * Common task queries with type safety
 */
export const taskQueries = {
  // Get all active tasks
  getActiveTasks: () => 
    db.select().from(schema.tasks).where(eq(schema.tasks.is_active, true)),

  // Get tasks by priority
  getTasksByPriority: (priority: number) =>
    db.select().from(schema.tasks)
      .where(and(
        eq(schema.tasks.is_active, true),
        eq(schema.tasks.priority, priority)
      )),

  // Search tasks by title
  searchTasks: (query: string) =>
    db.select().from(schema.tasks)
      .where(and(
        eq(schema.tasks.is_active, true),
        or(
          like(schema.tasks.title, `%${query}%`),
          like(schema.tasks.description, `%${query}%`)
        )
      )),

  // Get task with completions
  getTaskWithCompletions: (taskId: number) =>
    db.select({
      task: schema.tasks,
      completion: schema.taskCompletions
    })
    .from(schema.tasks)
    .leftJoin(schema.taskCompletions, eq(schema.tasks.task_id, schema.taskCompletions.task_id))
    .where(eq(schema.tasks.task_id, taskId))
};

/**
 * Common checklist queries
 */
export const checklistQueries = {
  // Get checklists with items
  getChecklistsWithItems: () =>
    db.select({
      checklist: schema.checklists,
      item: schema.checklistItems
    })
    .from(schema.checklists)
    .leftJoin(schema.checklistItems, eq(schema.checklists.checklist_id, schema.checklistItems.checklist_id))
    .orderBy(desc(schema.checklists.created_at), asc(schema.checklistItems.position)),

  // Get checklist by category
  getChecklistsByCategory: (category: string) =>
    db.select().from(schema.checklists)
      .where(eq(schema.checklists.category, category))
};

/**
 * Common journal queries
 */
export const journalQueries = {
  // Get recent entries
  getRecentEntries: (limit = 100) =>
    db.select().from(schema.journalEntries)
      .orderBy(desc(schema.journalEntries.created_at))
      .limit(limit),

  // Get entries by date range
  getEntriesByDateRange: (from: string, to: string) =>
    db.select().from(schema.journalEntries)
      .where(and(
        isNotNull(schema.journalEntries.created_at),
        // Add your date comparison logic here
      ))
      .orderBy(desc(schema.journalEntries.created_at))
};

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute multiple operations in a transaction
 * Automatically rolls back on error
 */
export function transaction<T>(callback: (tx: typeof db) => T): T {
  return db.transaction(callback);
}

/**
 * Example: Complete a task (update task + create completion) atomically
 */
export function completeTaskTransaction(taskId: number, note?: string) {
  return transaction((tx) => {
    // Get task details
    const task = tx.select().from(schema.tasks)
      .where(eq(schema.tasks.task_id, taskId))
      .get();
    
    if (!task) {
      throw new Error('Task not found');
    }

    // Create completion record
    const completion = tx.insert(schema.taskCompletions).values({
      task_id: taskId,
      xp_earned: task.xp_reward,
      coins_earned: task.coin_reward,
      note: note || null,
      completed_at: new Date().toISOString()
    }).returning().get();

    // Soft delete task
    tx.update(schema.tasks)
      .set({ is_active: false })
      .where(eq(schema.tasks.task_id, taskId))
      .run();

    return {
      task,
      completion,
      earned_xp: task.xp_reward,
      earned_coins: task.coin_reward
    };
  });
}