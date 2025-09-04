const Database = require("better-sqlite3");
const db = new Database("./app.db");
function hasCol(table, name){
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name);
  return cols.includes(name);
}
db.transaction(()=>{
  if (!hasCol("checklist_items","position")) {
    db.exec("ALTER TABLE checklist_items ADD COLUMN position INTEGER");
    db.exec(`
      WITH numbered AS (
        SELECT item_id, checklist_id,
               ROW_NUMBER() OVER (PARTITION BY checklist_id ORDER BY item_id) AS rn
        FROM checklist_items
      )
      UPDATE checklist_items
      SET position = (SELECT rn FROM numbered WHERE numbered.item_id = checklist_items.item_id)
      WHERE position IS NULL
    `);
  }
  if (!hasCol("tasks","xp_reward"))   db.exec("ALTER TABLE tasks ADD COLUMN xp_reward INTEGER DEFAULT 0");
  if (!hasCol("tasks","coin_reward")) db.exec("ALTER TABLE tasks ADD COLUMN coin_reward INTEGER DEFAULT 0");
  if (!hasCol("tasks","is_active"))   db.exec("ALTER TABLE tasks ADD COLUMN is_active INTEGER DEFAULT 1");
  if (!hasCol("tasks","created_at"))  db.exec("ALTER TABLE tasks ADD COLUMN created_at TEXT");
  if (!hasCol("checklists","created_at")) db.exec("ALTER TABLE checklists ADD COLUMN created_at TEXT");
})();
console.log("OK");
