// FILE: schema.ts - Complete Drizzle ORM schema definitions
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// TASKS TABLE
// ============================================================================
export const tasks = sqliteTable('tasks', {
  task_id: integer('task_id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  priority: integer('priority').notNull().default(2),
  xp_reward: integer('xp_reward').notNull().default(0),
  coin_reward: integer('coin_reward').notNull().default(0),
  category_id: integer('category_id'),
  due_date: text('due_date'), // ISO date string
  due_time: text('due_time'), // HH:MM format
  created_at: text('created_at').notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

// ============================================================================
// TASK COMPLETIONS TABLE - FIXED: Added missing note column
// ============================================================================
export const taskCompletions = sqliteTable('task_completions', {
  completion_id: integer('completion_id').primaryKey({ autoIncrement: true }),
  task_id: integer('task_id').notNull().references(() => tasks.task_id),
  xp_earned: integer('xp_earned').notNull().default(0),
  coins_earned: integer('coins_earned').notNull().default(0),
  note: text('note'), // ← ADDED: Missing note column for completion notes
  completed_at: text('completed_at').notNull()
});

// ============================================================================
// CHECKLISTS TABLE
// ============================================================================
export const checklists = sqliteTable('checklists', {
  checklist_id: integer('checklist_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  created_at: text('created_at').notNull()
});

// ============================================================================
// CHECKLIST ITEMS TABLE - FIXED: Use 'text' instead of 'content'
// ============================================================================
export const checklistItems = sqliteTable('checklist_items', {
  item_id: integer('item_id').primaryKey({ autoIncrement: true }),
  checklist_id: integer('checklist_id').notNull().references(() => checklists.checklist_id),
  text: text('text').notNull(), // ← FIXED: Using 'text' to match actual database
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
  created_at: text('created_at').notNull()
});

// ============================================================================
// JOURNAL ENTRIES TABLE
// ============================================================================
export const journalEntries = sqliteTable('journal_entries', {
  entry_id: integer('entry_id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  mood: integer('mood'), // 1-10 scale
  energy: integer('energy'), // 1-10 scale
  stress: integer('stress'), // 1-10 scale
  tags: text('tags'), // Comma-separated tags
  created_at: text('created_at').notNull()
});

// ============================================================================
// WORKOUT SESSIONS TABLE (Future enhancement)
// ============================================================================
export const workoutSessions = sqliteTable('workout_sessions', {
  session_id: integer('session_id').primaryKey({ autoIncrement: true }),
  exercise_type: text('exercise_type').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  intensity: integer('intensity'), // 1-10 scale
  notes: text('notes'),
  recorded_at: text('recorded_at').notNull()
});

// ============================================================================
// TASK CATEGORIES TABLE (Future enhancement)
// ============================================================================
export const taskCategories = sqliteTable('task_categories', {
  category_id: integer('category_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#6b7280'),
  icon: text('icon'),
  created_at: text('created_at').notNull()
});

// ============================================================================
// USERS TABLE (Multi-user support for families)
// ============================================================================
export const users = sqliteTable('users', {
  user_id: integer('user_id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  xp: integer('xp').notNull().default(0),
  coins: integer('coins').notNull().default(0),
  level: integer('level').notNull().default(1),
  created_at: text('created_at').notNull()
});

// ============================================================================
// SETTINGS TABLE (App configuration)
// ============================================================================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
});

// ============================================================================
// AI MEMORY TABLE (For AI context persistence)
// ============================================================================
export const aiMemory = sqliteTable('ai_memory', {
  memory_id: integer('memory_id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  meta_json: text('meta_json'), // JSON metadata
  created_at: text('created_at').notNull()
});

// ============================================================================
// RELATIONS (for joins and type safety)
// ============================================================================

// Tasks relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  category: one(taskCategories, {
    fields: [tasks.category_id],
    references: [taskCategories.category_id]
  }),
  completions: many(taskCompletions)
}));

// Task completions relations
export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCompletions.task_id],
    references: [tasks.task_id]
  })
}));

// Checklists relations
export const checklistsRelations = relations(checklists, ({ many }) => ({
  items: many(checklistItems)
}));

// Checklist items relations
export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  checklist: one(checklists, {
    fields: [checklistItems.checklist_id],
    references: [checklists.checklist_id]
  })
}));

// Task categories relations
export const taskCategoriesRelations = relations(taskCategories, ({ many }) => ({
  tasks: many(tasks)
}));

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  completions: many(taskCompletions)
}));

// ============================================================================
// EXPORT SCHEMA FOR DRIZZLE
// ============================================================================
export const schema = {
  tasks,
  taskCompletions,
  checklists,
  checklistItems,
  journalEntries,
  workoutSessions,
  taskCategories,
  users,
  settings,
  aiMemory,
  // Relations
  tasksRelations,
  taskCompletionsRelations,
  checklistsRelations,
  checklistItemsRelations,
  taskCategoriesRelations,
  usersRelations
};

// ============================================================================
// TYPE EXPORTS (for use in your app)
// ============================================================================
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type NewTaskCompletion = typeof taskCompletions.$inferInsert;

export type Checklist = typeof checklists.$inferSelect;
export type NewChecklist = typeof checklists.$inferInsert;

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;

export type TaskCategory = typeof taskCategories.$inferSelect;
export type NewTaskCategory = typeof taskCategories.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type AiMemory = typeof aiMemory.$inferSelect;
export type NewAiMemory = typeof aiMemory.$inferInsert;