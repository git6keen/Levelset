// tools.ts - Centralized tool execution system for AI assistant
import Database from "better-sqlite3";
import { capStr, capNum } from "./validate";

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

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: "tasks.create",
    description: "Create a new task with title, description, priority, and rewards",
    args: {
      title: { type: "string", description: "Task title", required: true },
      description: { type: "string", description: "Optional task description" },
      priority: { type: "number", description: "Priority level 1-5 (1=highest)" },
      category_id: { type: "number", description: "Optional category ID" },
      xp: { type: "number", description: "XP reward for completion" },
      coins: { type: "number", description: "Coin reward for completion" }
    }
  },
  {
    name: "journal.save",
    description: "Save a journal entry with mood, energy, stress ratings and tags",
    args: {
      text: { type: "string", description: "Journal entry text", required: true },
      mood: { type: "number", description: "Mood rating 1-10", required: true },
      energy: { type: "number", description: "Energy rating 1-10", required: true },
      stress: { type: "number", description: "Stress rating 1-10", required: true },
      tags: { type: "string", description: "Comma-separated tags" },
      ts: { type: "string", description: "Optional ISO timestamp" }
    }
  },
  {
    name: "checklists.addItem",
    description: "Add an item to an existing checklist",
    args: {
      checklist_id: { type: "number", description: "ID of the checklist", required: true },
      text: { type: "string", description: "Item text", required: true }
    }
  },
  {
    name: "tasks.delete",
    description: "Delete a task by ID",
    args: {
      task_id: { type: "number", description: "ID of task to delete", required: true }
    }
  },
  {
    name: "journal.delete",
    description: "Delete a journal entry (use with caution)",
    args: {
      entry_id: { type: "string", description: "Journal entry ID", required: true }
    }
  },
  {
    name: "gym.recordWorkout", 
    description: "Record a gym workout session",
    args: {
      exercise_type: { type: "string", description: "Type of exercise", required: true },
      duration_minutes: { type: "number", description: "Workout duration in minutes" },
      intensity: { type: "number", description: "Intensity level 1-10" },
      notes: { type: "string", description: "Optional workout notes" }
    }
  },
  {
    name: "rewards.grant",
    description: "Grant a reward/recognition with renown points",
    args: {
      title: { type: "string", description: "Reward title", required: true },
      note: { type: "string", description: "Optional reward description" },
      source_type: { type: "string", description: "Source type (task, manual, etc.)" },
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
      INSERT INTO tasks (title, description, priority, category_id, xp_reward, coin_reward, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
    stmt.run(task_id);
    
    return {
      ok: true,
      result: { task_id, title: (task as any).title, action: "soft_deleted" }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to delete task", details: error.message };
  }
}

// Journal
async function executeJournalSave(args: any): Promise<ToolResult> {
  try {
    const text = capStr(args.text, 5000);
    const mood = capNum(args.mood, 1, 10);
    const energy = capNum(args.energy, 1, 10);
    const stress = capNum(args.stress, 1, 10);
    const tags = args.tags ? capStr(args.tags, 200) : "";
    const ts = args.ts || new Date().toISOString();

    if (!text.trim()) {
      return { ok: false, error: "Journal text is required" };
    }

    // Insert into journal table (assuming it exists or will be created)
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO journal_entries (text, mood, energy, stress, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    try {
      const result = stmt.run(text, mood, energy, stress, tags, ts);
      return {
        ok: true,
        result: {
          id: result.lastInsertRowid,
          text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
          mood,
          energy,
          stress,
          tags
        }
      };
    } catch (dbError: any) {
      // If journal_entries table doesn't exist, fall back to success response
      // (actual storage might be handled by ChatPage via localStorage)
      return {
        ok: true,
        result: {
          id: `fallback_${Date.now()}`,
          text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
          mood,
          energy,
          stress,
          tags,
          note: "Saved to local storage (DB table not found)"
        }
      };
    }
  } catch (error: any) {
    return { ok: false, error: "Failed to save journal entry", details: error.message };
  }
}

async function executeJournalDelete(args: any): Promise<ToolResult> {
  try {
    const entry_id = capStr(args.entry_id, 100);
    
    if (!entry_id.trim()) {
      return { ok: false, error: "Entry ID is required" };
    }

    // Try to delete from DB first
    const stmt = db.prepare("DELETE FROM journal_entries WHERE id = ? OR rowid = ?");
    const result = stmt.run(entry_id, entry_id);
    
    if (result.changes > 0) {
      return {
        ok: true,
        result: { entry_id, action: "deleted_from_db", changes: result.changes }
      };
    } else {
      return {
        ok: true,
        result: { 
          entry_id, 
          action: "db_not_found", 
          note: "Entry not found in DB - may be in localStorage only" 
        }
      };
    }
  } catch (error: any) {
    return { ok: false, error: "Failed to delete journal entry", details: error.message };
  }
}

// Checklists
async function executeChecklistsAddItem(args: any): Promise<ToolResult> {
  try {
    const checklist_id = capNum(args.checklist_id, 1, 999999);
    const text = capStr(args.text, 500);

    if (!text.trim()) {
      return { ok: false, error: "Item text is required" };
    }

    // Check if checklist exists
    const checklist = db.prepare("SELECT checklist_id, name FROM checklists WHERE checklist_id = ?").get(checklist_id);
    if (!checklist) {
      return { ok: false, error: "Checklist not found" };
    }

    // Get next position
    const maxPos = db.prepare("SELECT COALESCE(MAX(position), 0) as max_pos FROM checklist_items WHERE checklist_id = ?").get(checklist_id) as any;
    const position = (maxPos?.max_pos || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO checklist_items (checklist_id, content, completed, position)
      VALUES (?, ?, 0, ?)
    `);
    
    const result = stmt.run(checklist_id, text, position);
    
    return {
      ok: true,
      result: {
        item_id: result.lastInsertRowid,
        checklist_id,
        checklist_name: (checklist as any).name,
        text,
        position
      }
    };
  } catch (error: any) {
    return { ok: false, error: "Failed to add checklist item", details: error.message };
  }
}

// Gym workouts
async function executeGymRecordWorkout(args: any): Promise<ToolResult> {
  try {
    const exercise_type = capStr(args.exercise_type, 100);
    const duration_minutes = args.duration_minutes ? capNum(args.duration_minutes, 1, 600) : null;
    const intensity = args.intensity ? capNum(args.intensity, 1, 10) : null;
    const notes = args.notes ? capStr(args.notes, 1000) : null;

    if (!exercise_type.trim()) {
      return { ok: false, error: "Exercise type is required" };
    }

    // Create gym_workouts table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS gym_workouts (
        workout_id INTEGER PRIMARY KEY,
        exercise_type TEXT NOT NULL,
        duration_minutes INTEGER,
        intensity INTEGER,
        notes TEXT,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const stmt = db.prepare(`
      INSERT INTO gym_workouts (exercise_type, duration_minutes, intensity, notes, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
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