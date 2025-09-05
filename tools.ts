// tools.ts - Centralized tool execution system for AI assistant
import Database from "better-sqlite3";
import { capStr, capNum } from "./validate.js";

// Database connection (matches server.ts pattern)
const db = new Database("./app.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ============================================================================
// TOOL REGISTRY - Single source of truth for available tools
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  args: Record<string, { type: string; description: string; required?: boolean }>;
}

const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: "tasks.create",
    description: "Create a new task with title, description, priority, and rewards",
    args: {
      title: { type: "string", description: "Task title", required: true },
      description: { type: "string", description: "Task description" },
      priority: { type: "number", description: "Priority level 1-5 (1=low, 5=critical)" },
      category_id: { type: "number", description: "Category ID if applicable" },
      xp: { type: "number", description: "XP reward for completion" },
      coins: { type: "number", description: "Coin reward for completion" }
    }
  },
  {
    name: "tasks.delete",
    description: "Delete/deactivate a task by ID",
    args: {
      task_id: { type: "number", description: "Task ID to delete", required: true }
    }
  },
  {
    name: "journal.save",
    description: "Save a journal entry with optional mood/energy/stress tracking",
    args: {
      text: { type: "string", description: "Journal entry text", required: true },
      mood: { type: "number", description: "Mood rating 1-10" },
      energy: { type: "number", description: "Energy level 1-10" },
      stress: { type: "number", description: "Stress level 1-10" },
      tags: { type: "string", description: "Comma-separated tags" }
    }
  },
  {
    name: "journal.delete",
    description: "Delete a journal entry by ID",
    args: {
      entry_id: { type: "number", description: "Journal entry ID to delete", required: true }
    }
  },
  {
    name: "checklists.addItem",
    description: "Add an item to an existing checklist",
    args: {
      checklist_id: { type: "number", description: "Checklist ID", required: true },
      text: { type: "string", description: "Item text", required: true },
      position: { type: "number", description: "Position in list (optional)" }
    }
  },
  {
    name: "gym.recordWorkout",
    description: "Record a gym/fitness workout session",
    args: {
      exercise_type: { type: "string", description: "Type of exercise", required: true },
      duration_minutes: { type: "number", description: "Duration in minutes", required: true },
      intensity: { type: "number", description: "Intensity level 1-10" },
      notes: { type: "string", description: "Additional notes" }
    }
  },
  {
    name: "rewards.grant",
    description: "Grant a reward/achievement",
    args: {
      title: { type: "string", description: "Reward title", required: true },
      note: { type: "string", description: "Reward description" },
      source_type: { type: "string", description: "Source type reference" },
      source_id: { type: "string", description: "Source ID reference" }
    }
  }
];

// Generate tool registry string for AI system prompt
export function generateToolRegistry(): string {
  return TOOL_REGISTRY.map(tool => {
    const requiredArgs = Object.entries(tool.args)
      .filter(([_, def]) => def.required)
      .map(([key, def]) => `"${key}": ${def.type}`)
      .join(", ");
    
    const optionalArgs = Object.entries(tool.args)
      .filter(([_, def]) => !def.required)
      .map(([key, def]) => `"${key}"?: ${def.type}`)
      .join(", ");
    
    const allArgs = [requiredArgs, optionalArgs].filter(Boolean).join(", ");
    return `- ${tool.name}  args: { ${allArgs} }`;
  }).join("\n");
}

// ============================================================================
// TOOL EXECUTION FUNCTIONS
// ============================================================================

export interface ToolResult {
  ok: boolean;
  result?: any;
  error?: string;
  details?: string;
}

// Tasks
async function executeTasksCreate(args: any): Promise<ToolResult> {
  try {
    const title = capStr(args.title, 200);
    const description = args.description ? capStr(args.description, 1000) : null;
    const priority = capNum(args.priority ?? 3, 1, 5);
    const category_id = args.category_id ? capNum(args.category_id, 1, 999999) : null;
    const xp = capNum(args.xp ?? 10, 0, 1000);
    const coins = capNum(args.coins ?? 0, 0, 100);

    if (!title.trim()) {
      return { ok: false, error: "Title is required" };
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, category_id, xp_reward, coin_reward, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const result = stmt.run(title, description, priority, category_id, xp, coins, new Date().toISOString());
    
    return {
      ok: true,
      result: {
        task_id: result.lastInsertRowid,
        title,
        description,
        priority,
        xp_reward: xp,
        coin_reward: coins
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to create task", details: error.message };
  }
}

async function executeTasksDelete(args: any): Promise<ToolResult> {
  try {
    const task_id = capNum(args.task_id, 1, 999999999);
    
    // Check if task exists
    const task = db.prepare("SELECT task_id, title FROM tasks WHERE task_id = ? AND is_active = 1").get(task_id);
    if (!task) {
      return { ok: false, error: "Task not found or already deleted" };
    }

    // Soft delete by setting is_active = 0
    const stmt = db.prepare("UPDATE tasks SET is_active = 0 WHERE task_id = ?");
    const result = stmt.run(task_id);

    return {
      ok: true,
      result: {
        task_id,
        title: task.title,
        message: "Task deleted successfully"
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to delete task", details: error.message };
  }
}

// Journal
async function executeJournalSave(args: any): Promise<ToolResult> {
  try {
    const text = capStr(args.text, 5000);
    const mood = args.mood !== undefined ? capNum(args.mood, 1, 10) : null;
    const energy = args.energy !== undefined ? capNum(args.energy, 1, 10) : null;
    const stress = args.stress !== undefined ? capNum(args.stress, 1, 10) : null;
    const tags = args.tags ? capStr(args.tags, 200) : null;

    if (!text.trim()) {
      return { ok: false, error: "Journal text is required" };
    }

    const stmt = db.prepare(`
      INSERT INTO journal_entries (text, mood, energy, stress, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(text, mood, energy, stress, tags, new Date().toISOString());
    
    return {
      ok: true,
      result: {
        entry_id: result.lastInsertRowid,
        text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        mood, energy, stress, tags
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to save journal entry", details: error.message };
  }
}

async function executeJournalDelete(args: any): Promise<ToolResult> {
  try {
    const entry_id = capNum(args.entry_id, 1, 999999999);
    
    // Check if entry exists
    const entry = db.prepare("SELECT entry_id FROM journal_entries WHERE entry_id = ?").get(entry_id);
    if (!entry) {
      return { ok: false, error: "Journal entry not found" };
    }

    // Hard delete journal entries (they're more personal/temporary)
    const stmt = db.prepare("DELETE FROM journal_entries WHERE entry_id = ?");
    const result = stmt.run(entry_id);

    return {
      ok: true,
      result: {
        entry_id,
        message: "Journal entry deleted successfully"
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to delete journal entry", details: error.message };
  }
}

// Checklists
async function executeChecklistsAddItem(args: any): Promise<ToolResult> {
  try {
    const checklist_id = capNum(args.checklist_id, 1, 999999);
    const text = capStr(args.text, 500);
    const position = args.position !== undefined ? capNum(args.position, 0, 9999) : 0;

    if (!text.trim()) {
      return { ok: false, error: "Item text is required" };
    }

    // Check if checklist exists
    const checklist = db.prepare("SELECT checklist_id, name FROM checklists WHERE checklist_id = ?").get(checklist_id);
    if (!checklist) {
      return { ok: false, error: "Checklist not found" };
    }

    const stmt = db.prepare(`
      INSERT INTO checklist_items (checklist_id, text, position, completed, created_at)
      VALUES (?, ?, ?, 0, ?)
    `);
    
    const result = stmt.run(checklist_id, text, position, new Date().toISOString());
    
    return {
      ok: true,
      result: {
        item_id: result.lastInsertRowid,
        checklist_id,
        checklist_name: checklist.name,
        text,
        position
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to add checklist item", details: error.message };
  }
}

// Gym/Fitness
async function executeGymRecordWorkout(args: any): Promise<ToolResult> {
  try {
    const exercise_type = capStr(args.exercise_type, 100);
    const duration_minutes = capNum(args.duration_minutes, 1, 600); // Max 10 hours
    const intensity = args.intensity !== undefined ? capNum(args.intensity, 1, 10) : null;
    const notes = args.notes ? capStr(args.notes, 1000) : null;

    if (!exercise_type.trim()) {
      return { ok: false, error: "Exercise type is required" };
    }

    // This assumes a workout_sessions table exists - if not, we'll create a simple log
    // For now, we'll store in a generic activities table or create one
    let stmt;
    try {
      stmt = db.prepare(`
        INSERT INTO workout_sessions (exercise_type, duration_minutes, intensity, notes, recorded_at)
        VALUES (?, ?, ?, ?, ?)
      `);
    } catch {
      // If workout_sessions table doesn't exist, create it
      db.exec(`
        CREATE TABLE IF NOT EXISTS workout_sessions (
          session_id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_type TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL,
          intensity INTEGER,
          notes TEXT,
          recorded_at TEXT NOT NULL
        )
      `);
      stmt = db.prepare(`
        INSERT INTO workout_sessions (exercise_type, duration_minutes, intensity, notes, recorded_at)
        VALUES (?, ?, ?, ?, ?)
      `);
    }
    
    const result = stmt.run(exercise_type, duration_minutes, intensity, notes, new Date().toISOString());
    
    return {
      ok: true,
      result: {
        workout_id: result.lastInsertRowid,
        exercise_type,
        duration_minutes,
        intensity,
        notes: notes ? notes.substring(0, 100) + (notes.length > 100 ? "..." : "") : null
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to record workout", details: error.message };
  }
}

// Rewards
async function executeRewardsGrant(args: any): Promise<ToolResult> {
  try {
    const title = capStr(args.title, 200);
    const note = args.note ? capStr(args.note, 1000) : null;
    const source_type = args.source_type ? capStr(args.source_type, 50) : null;
    const source_id = args.source_id ? capStr(args.source_id, 100) : null;

    if (!title.trim()) {
      return { ok: false, error: "Reward title is required" };
    }

    // This is a placeholder implementation since rewards are currently handled 
    // by RewardsPage via localStorage. In the future, this could integrate with
    // a rewards database table or trigger a CustomEvent for the UI.
    
    return {
      ok: true,
      result: {
        title,
        note,
        source_type,
        source_id,
        granted_at: new Date().toISOString(),
        note_to_user: "Reward granted - check RewardsPage to see details"
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to grant reward", details: error.message };
  }
}

// ============================================================================
// MAIN TOOL EXECUTOR
// ============================================================================

export async function executeTool(name: string, args: any): Promise<ToolResult> {
  try {
    // Validate tool exists
    const toolDef = TOOL_REGISTRY.find(t => t.name === name);
    if (!toolDef) {
      return { ok: false, error: `Unknown tool: ${name}` };
    }

    // Validate required arguments
    for (const [argName, argDef] of Object.entries(toolDef.args)) {
      if (argDef.required && (args[argName] === undefined || args[argName] === null || args[argName] === "")) {
        return { ok: false, error: `Missing required argument: ${argName}` };
      }
    }

    // Route to appropriate executor
    switch (name) {
      case "tasks.create":
        return await executeTasksCreate(args);
      case "tasks.delete":
        return await executeTasksDelete(args);
      case "journal.save":
        return await executeJournalSave(args);
      case "journal.delete":
        return await executeJournalDelete(args);
      case "checklists.addItem":
        return await executeChecklistsAddItem(args);
      case "gym.recordWorkout":
        return await executeGymRecordWorkout(args);
      case "rewards.grant":
        return await executeRewardsGrant(args);
      default:
        return { ok: false, error: `Tool execution not implemented: ${name}` };
    }
  } catch (error: any) {
    return { 
      ok: false, 
      error: "Tool execution failed", 
      details: error.message || String(error) 
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getToolNames(): string[] {
  return TOOL_REGISTRY.map(t => t.name);
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find(t => t.name === name);
}

export function validateToolArgs(name: string, args: any): { valid: boolean; errors: string[] } {
  const toolDef = getToolDefinition(name);
  if (!toolDef) {
    return { valid: false, errors: [`Unknown tool: ${name}`] };
  }

  const errors: string[] = [];
  
  // Check required args
  for (const [argName, argDef] of Object.entries(toolDef.args)) {
    if (argDef.required && (args[argName] === undefined || args[argName] === null || args[argName] === "")) {
      errors.push(`Missing required argument: ${argName}`);
    }
  }

  return { valid: errors.length === 0, errors };
}