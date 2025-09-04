import Database from "better-sqlite3";
const db = new Database("./app.db"); db.exec(`
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);
CREATE INDEX IF NOT EXISTS idx_checklists_name ON checklists(name);
CREATE INDEX IF NOT EXISTS idx_items_checklist ON checklist_items(checklist_id);
`); console.log("Indexes ensured.");
