// FILE: seed_demo.ts - Modern database seeder with enhanced functionality
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = resolve(__dirname, "./app.db");

// ============================================================================
// TYPES
// ============================================================================
interface TableInfo {
  name: string;
  exists: boolean;
  count: number;
}

interface SeedData {
  tasks: Array<{
    title: string;
    description?: string;
    priority: number;
    xp_reward: number;
    coin_reward: number;
    category_id?: number;
  }>;
  checklists: Array<{
    name: string;
    category: string;
    items: string[];
  }>;
  categories: Array<{
    name: string;
    color: string;
    position: number;
  }>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function validateDatabase(): Database.Database {
  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    return db;
  } catch (error) {
    console.error(`❌ Failed to connect to database: ${error}`);
    process.exit(1);
  }
}

function tableExists(db: Database.Database, tableName: string): boolean {
  try {
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);
    return !!result;
  } catch {
    return false;
  }
}

function getTableCount(db: Database.Database, tableName: string): number {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    return result.count;
  } catch {
    return 0;
  }
}

function getTableInfo(db: Database.Database, tableNames: string[]): TableInfo[] {
  return tableNames.map(name => ({
    name,
    exists: tableExists(db, name),
    count: tableExists(db, name) ? getTableCount(db, name) : 0
  }));
}

// ============================================================================
// SEED DATA DEFINITIONS
// ============================================================================
const DEMO_DATA: SeedData = {
  categories: [
    { name: "Work", color: "#3b82f6", position: 1 },
    { name: "Personal", color: "#22c55e", position: 2 },
    { name: "Health", color: "#f59e0b", position: 3 },
    { name: "Learning", color: "#8b5cf6", position: 4 },
    { name: "Habits", color: "#ef4444", position: 5 }
  ],
  
  tasks: [
    {
      title: "Setup project structure",
      description: "Organize the codebase with proper folder structure and conventions",
      priority: 3,
      xp_reward: 50,
      coin_reward: 10,
      category_id: 1
    },
    {
      title: "Wire TypeScript backend",
      description: "Complete the migration to modern TypeScript with ESM modules",
      priority: 4,
      xp_reward: 80,
      coin_reward: 20,
      category_id: 1
    },
    {
      title: "Add checklist editor",
      description: "Create a modern, interactive checklist management interface",
      priority: 2,
      xp_reward: 40,
      coin_reward: 8,
      category_id: 1
    },
    {
      title: "Daily meditation",
      description: "10 minutes of mindfulness practice",
      priority: 2,
      xp_reward: 25,
      coin_reward: 5,
      category_id: 3
    },
    {
      title: "Read for 30 minutes",
      description: "Continue reading current book or technical documentation",
      priority: 1,
      xp_reward: 30,
      coin_reward: 6,
      category_id: 4
    },
    {
      title: "Exercise routine",
      description: "Complete daily workout - strength or cardio",
      priority: 3,
      xp_reward: 40,
      coin_reward: 8,
      category_id: 3
    }
  ],

  checklists: [
    {
      name: "Daily Routine",
      category: "habits",
      items: [
        "10 min mobility warm-up",
        "20 min strength training",
        "10 min cooldown stretches",
        "Review today's tasks",
        "Plan tomorrow's priorities"
      ]
    },
    {
      name: "Weekly Review",
      category: "productivity",
      items: [
        "Review completed tasks",
        "Analyze time spent on different activities",
        "Set goals for next week",
        "Clean up workspace",
        "Update project documentation"
      ]
    },
    {
      name: "Morning Checklist",
      category: "habits",
      items: [
        "Make bed",
        "Drink water",
        "Check weather",
        "Review calendar",
        "Quick email check"
      ]
    },
    {
      name: "Project Setup",
      category: "development",
      items: [
        "Initialize repository",
        "Setup development environment",
        "Configure linting and formatting",
        "Create basic project structure",
        "Write initial documentation"
      ]
    }
  ]
};

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================
function seedCategories(db: Database.Database): number {
  console.log("🏷️  Seeding task categories...");
  
  const insertCategory = db.prepare(`
    INSERT INTO task_categories (name, color, position)
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const category of DEMO_DATA.categories) {
      insertCategory.run(category.name, category.color, category.position);
    }
  });

  transaction();
  return DEMO_DATA.categories.length;
}

function seedTasks(db: Database.Database): number {
  console.log("📋 Seeding tasks...");
  
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, priority, xp_reward, coin_reward, category_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction(() => {
    for (const task of DEMO_DATA.tasks) {
      insertTask.run(
        task.title,
        task.description || null,
        task.priority,
        task.xp_reward,
        task.coin_reward,
        task.category_id || null
      );
    }
  });

  transaction();
  return DEMO_DATA.tasks.length;
}

function seedChecklists(db: Database.Database): { checklists: number; items: number } {
  console.log("✅ Seeding checklists...");
  
  const insertChecklist = db.prepare(`
    INSERT INTO checklists (name, category, created_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  
  const insertItem = db.prepare(`
    INSERT INTO checklist_items (checklist_id, content, completed, position)
    VALUES (?, ?, 0, ?)
  `);

  let totalItems = 0;

  const transaction = db.transaction(() => {
    for (const checklist of DEMO_DATA.checklists) {
      const result = insertChecklist.run(checklist.name, checklist.category);
      const checklistId = result.lastInsertRowid;
      
      checklist.items.forEach((item, index) => {
        insertItem.run(checklistId, item, index + 1);
        totalItems++;
      });
    }
  });

  transaction();
  return { checklists: DEMO_DATA.checklists.length, items: totalItems };
}

// ============================================================================
// MAIN SEEDING LOGIC
// ============================================================================
function performSeeding(db: Database.Database): void {
  console.log("🌱 Starting database seeding...\n");

  // Check if we should seed categories
  const categoryCount = getTableCount(db, "task_categories");
  let categoriesSeeded = 0;
  
  if (categoryCount === 0) {
    categoriesSeeded = seedCategories(db);
    console.log(`   ✓ Added ${categoriesSeeded} categories`);
  } else {
    console.log(`   ℹ️  Skipping categories (${categoryCount} already exist)`);
  }

  // Check if we should seed tasks
  const taskCount = getTableCount(db, "tasks");
  let tasksSeeded = 0;
  
  if (taskCount === 0) {
    tasksSeeded = seedTasks(db);
    console.log(`   ✓ Added ${tasksSeeded} tasks`);
  } else {
    console.log(`   ℹ️  Skipping tasks (${taskCount} already exist)`);
  }

  // Check if we should seed checklists
  const checklistCount = getTableCount(db, "checklists");
  let checklistsSeeded = { checklists: 0, items: 0 };
  
  if (checklistCount === 0) {
    checklistsSeeded = seedChecklists(db);
    console.log(`   ✓ Added ${checklistsSeeded.checklists} checklists with ${checklistsSeeded.items} items`);
  } else {
    console.log(`   ℹ️  Skipping checklists (${checklistCount} already exist)`);
  }

  // Summary
  const totalSeeded = categoriesSeeded + tasksSeeded + checklistsSeeded.checklists;
  if (totalSeeded > 0) {
    console.log(`\n🎉 Seeding completed! Added ${totalSeeded} records total.`);
  } else {
    console.log("\n✨ Database already has data - seeding skipped.");
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
function main(): void {
  console.log("🗄️  Database Seeder - Demo Data Generator");
  console.log("==========================================\n");

  const db = validateDatabase();
  
  // Check required tables
  const requiredTables = ["tasks", "checklists", "checklist_items", "task_categories"];
  const tableInfo = getTableInfo(db, requiredTables);
  
  console.log("📊 Table Status:");
  tableInfo.forEach(table => {
    const status = table.exists ? `✅ ${table.count} records` : "❌ Missing";
    console.log(`   ${table.name}: ${status}`);
  });

  const missingTables = tableInfo.filter(t => !t.exists);
  if (missingTables.length > 0) {
    console.error(`\n❌ Missing required tables: ${missingTables.map(t => t.name).join(", ")}`);
    console.error("Run schema.sql first to create the required tables.");
    process.exit(1);
  }

  console.log(); // Empty line for readability
  
  try {
    performSeeding(db);
    console.log("\n🎯 Next steps:");
    console.log("   • Start the server: npm run dev");
    console.log("   • Open http://localhost:8002");
    console.log("   • Explore the demo data!");
  } catch (error) {
    console.error("\n💥 Seeding failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for programmatic use
export { main as seedDemoData, DEMO_DATA };