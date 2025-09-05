// FILE: migrate_task_categories.ts - ESM migration utility with modern TypeScript
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// ============================================================================
// TYPES
// ============================================================================
interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

interface TaskCategory {
  category_id: number;
  name: string;
  color: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================
const DB_PATH = path.resolve("./app.db");
const DEFAULT_COLOR = "#64748b";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function validateDatabase(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  return db;
}

function getColumns(db: Database.Database, tableName: string): string[] {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as ColumnInfo[];
    return columns.map(col => col.name);
  } catch (error) {
    return [];
  }
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  return !!result;
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================
function ensureTaskCategoriesTable(db: Database.Database): void {
  if (!tableExists(db, "task_categories")) {
    console.log("📝 Creating task_categories table...");
    db.exec(`
      CREATE TABLE task_categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT DEFAULT '${DEFAULT_COLOR}',
        position INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

function migrateTaskCategories(db: Database.Database): void {
  const columns = getColumns(db, "task_categories");
  
  if (columns.length === 0) {
    console.error("❌ task_categories table not found after creation attempt");
    process.exit(2);
  }

  const hasName = columns.includes("name");
  const hasLegacy = columns.includes("category_name");
  const hasColor = columns.includes("color");
  const hasPosition = columns.includes("position");

  console.log("🔍 Current columns:", columns.join(", "));

  const migration = db.transaction(() => {
    // 1) Ensure name column exists and is filled
    if (!hasName) {
      console.log("📝 Adding name column...");
      db.exec("ALTER TABLE task_categories ADD COLUMN name TEXT");
      
      if (hasLegacy) {
        console.log("🔄 Migrating from legacy category_name column...");
        db.exec("UPDATE task_categories SET name = COALESCE(name, category_name)");
      } else {
        console.log("🔧 Setting default name for existing records...");
        db.exec("UPDATE task_categories SET name = COALESCE(name, 'General')");
      }
    }

    // 2) Ensure color column exists
    if (!hasColor) {
      console.log("📝 Adding color column...");
      db.exec(`ALTER TABLE task_categories ADD COLUMN color TEXT DEFAULT '${DEFAULT_COLOR}'`);
    }

    // 3) Ensure position column exists
    if (!hasPosition) {
      console.log("📝 Adding position column...");
      db.exec("ALTER TABLE task_categories ADD COLUMN position INTEGER");
    }

    // 4) Create index for efficient ordering
    console.log("📝 Creating/updating indexes...");
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_task_categories_position 
      ON task_categories(position, category_id)
    `);

    // 5) Clean up any null/empty names
    console.log("🧹 Cleaning up empty names...");
    db.exec(`
      UPDATE task_categories 
      SET name = 'General' 
      WHERE name IS NULL OR TRIM(name) = ''
    `);

    // 6) Ensure all records have colors
    console.log("🎨 Ensuring all categories have colors...");
    db.exec(`
      UPDATE task_categories 
      SET color = '${DEFAULT_COLOR}' 
      WHERE color IS NULL OR TRIM(color) = ''
    `);
  });

  migration();
}

function createDefaultCategories(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM task_categories").get() as { count: number };
  
  if (count.count === 0) {
    console.log("🌱 Seeding default categories...");
    
    const insert = db.prepare(`
      INSERT INTO task_categories (name, color, position) 
      VALUES (?, ?, ?)
    `);

    const defaultCategories = [
      { name: "Daily", color: "#3b82f6", position: 1 },
      { name: "Work", color: "#8b5cf6", position: 2 },
      { name: "Personal", color: "#22c55e", position: 3 },
      { name: "Health", color: "#f59e0b", position: 4 },
      { name: "Learning", color: "#ef4444", position: 5 }
    ];

    const transaction = db.transaction(() => {
      for (const category of defaultCategories) {
        insert.run(category.name, category.color, category.position);
      }
    });

    transaction();
  }
}

function displayResults(db: Database.Database): void {
  console.log("\n📊 Migration Results:");
  
  const categories = db.prepare(`
    SELECT category_id, name, COALESCE(color, '${DEFAULT_COLOR}') as color, position
    FROM task_categories 
    ORDER BY COALESCE(position, 999), category_id 
    LIMIT 10
  `).all() as TaskCategory[];

  if (categories.length > 0) {
    console.table(categories);
  } else {
    console.log("ℹ️  No categories found");
  }

  const totalCount = db.prepare("SELECT COUNT(*) as count FROM task_categories").get() as { count: number };
  console.log(`\n✅ Migration completed successfully! (${totalCount.count} categories total)`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
function main(): void {
  console.log("🚀 Starting task_categories migration...");
  
  try {
    const db = validateDatabase();
    
    ensureTaskCategoriesTable(db);
    migrateTaskCategories(db);
    createDefaultCategories(db);
    displayResults(db);
    
    db.close();
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as migrateTaskCategories };