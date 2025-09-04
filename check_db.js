const Database = require("better-sqlite3");
const db = new Database("./app.db");
function cols(t){ return db.prepare(`PRAGMA table_info(${t})`).all().map(x=>x.name); }
function cnt(t){ return db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c; }
function safe(t){ try { return { cols: cols(t), count: cnt(t) }; } catch(e){ return { error: String(e) }; } }
const tables = ["tasks","checklists","checklist_items"];
for (const t of tables) {
  const info = safe(t);
  console.log(`TABLE ${t}:`, JSON.stringify(info));
}
