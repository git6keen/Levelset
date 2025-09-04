import Database from "better-sqlite3";

const db = new Database("./app.db");

function tableExists(name: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
  return !!row;
}

if (!tableExists("tasks") || !tableExists("checklists") || !tableExists("checklist_items")) {
  console.log("ERROR: required tables missing. Run schema first.");
  process.exit(1);
}

// Skip if already has data
const tCount = (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as any).c as number;
const cCount = (db.prepare("SELECT COUNT(*) as c FROM checklists").get() as any).c as number;

if (tCount > 0 || cCount > 0) {
  console.log("Seed skipped (data exists).");
  process.exit(0);
}

const insertTask = db.prepare("INSERT INTO tasks (title, priority, xp, coins) VALUES (?, ?, ?, ?)");
insertTask.run("Setup project structure", 3, 50, 10);
insertTask.run("Wire TS backend", 4, 80, 20);
insertTask.run("Add checklist editor", 2, 40, 8);

const insertChecklist = db.prepare("INSERT INTO checklists (name, category) VALUES (?, ?)");
const insertItem = db.prepare("INSERT INTO checklist_items (checklist_id, text, done) VALUES (?, ?, 0)");

const { lastInsertRowid: cid } = insertChecklist.run("Daily Routine", "habits");
insertItem.run(cid, "10 min mobility");
insertItem.run(cid, "20 min strength");
insertItem.run(cid, "10 min cooldown");

console.log("Seeded demo data.");
