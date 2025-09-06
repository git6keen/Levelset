// FILE: migrate_task_completions.js - Add missing note column (ESM version)
import Database from "better-sqlite3";

const db = new Database("./app.db");

function hasCol(table, name) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(x => x.name);
  return cols.includes(name);
}

console.log("🔍 Checking task_completions table structure...");

db.transaction(() => {
  // Check if note column exists
  if (!hasCol("task_completions", "note")) {
    console.log("📝 Adding missing 'note' column to task_completions table...");
    db.exec("ALTER TABLE task_completions ADD COLUMN note TEXT");
    console.log("✅ Note column added successfully!");
  } else {
    console.log("✅ Column 'note' already exists in task_completions table.");
  }

  // Verify final structure
  const columns = db.prepare("PRAGMA table_info(task_completions)").all();
  console.log("📋 Current task_completions columns:");
  columns.forEach(col => {
    console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
  });
})();

db.close();
console.log("🎉 Migration complete!");