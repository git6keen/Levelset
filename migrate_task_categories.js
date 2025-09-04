(() => {
  const fs = require("fs");
  const path = require("path");
  const Database = require("better-sqlite3");

  const DB_PATH = path.resolve("./app.db");
  if (!fs.existsSync(DB_PATH)) { console.error("app.db not found at", DB_PATH); process.exit(1); }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  const getCols = (tbl) => db.prepare(`PRAGMA table_info(${tbl})`).all().map(r => r.name);
  const cols = getCols("task_categories");
  if (!cols.length) { console.error("task_categories table not found."); process.exit(2); }

  const hasName = cols.includes("name");
  const hasLegacy = cols.includes("category_name");

  db.transaction(() => {
    // 1) Ensure name column exists and is filled (prefer legacy category_name when present)
    if (!hasName) {
      db.exec(`ALTER TABLE task_categories ADD COLUMN name TEXT`);
      if (hasLegacy) {
        db.exec(`UPDATE task_categories SET name = COALESCE(name, category_name)`);
      } else {
        // Fallback: at least set something non-null
        db.exec(`UPDATE task_categories SET name = COALESCE(name, 'General')`);
      }
    }

    // 2) Ensure helper columns exist
    const cols2 = getCols("task_categories");
    if (!cols2.includes("color"))    db.exec(`ALTER TABLE task_categories ADD COLUMN color TEXT DEFAULT '#64748b'`);
    if (!cols2.includes("position")) db.exec(`ALTER TABLE task_categories ADD COLUMN position INTEGER`);

    // 3) Index for ordering
    db.exec(`CREATE INDEX IF NOT EXISTS idx_task_categories_position ON task_categories(position, category_id)`);

    // 4) Final tidy (no blanks)
    db.exec(`UPDATE task_categories SET name = 'General' WHERE name IS NULL OR TRIM(name) = ''`);
  })();

  const sample = db.prepare(`SELECT category_id, name, COALESCE(color,'#64748b') AS color FROM task_categories ORDER BY category_id LIMIT 10`).all();
  console.log("✅ migration ok — sample:", sample);
})();
