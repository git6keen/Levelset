import Database from "better-sqlite3";

const db = new Database("./app.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function hasColumn(table: string, col: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return rows.some(r => r.name === col);
}

if (!hasColumn("checklist_items", "position")) {
  db.exec("ALTER TABLE checklist_items ADD COLUMN position INTEGER");
  const listIds = db.prepare("SELECT DISTINCT checklist_id FROM checklist_items").all() as any[];
  const upd = db.prepare("UPDATE checklist_items SET position = ? WHERE id = ?");
  for (const row of listIds) {
    const items = db.prepare("SELECT id FROM checklist_items WHERE checklist_id = ? ORDER BY id").all(row.checklist_id) as any[];
    items.forEach((it, idx) => upd.run(idx + 1, it.id));
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_pos ON checklist_items(checklist_id, position)");
  console.log("Added 'position' column and backfilled.");
} else {
  console.log("'position' already exists.");
}
