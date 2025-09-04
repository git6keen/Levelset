import Database from "better-sqlite3";
const db = new Database("./app.db");

const tasks = db.prepare("INSERT INTO tasks (title, priority, xp, coins) VALUES (?, ?, ?, ?)");
const cl    = db.prepare("INSERT INTO checklists (name, category) VALUES (?, ?)");
const item  = db.prepare("INSERT INTO checklist_items (checklist_id, text, done, position) VALUES (?, ?, 0, ?)");

tasks.run("Wire up backend in TS", 3, 50, 10);
tasks.run("Build inline checklist editor", 4, 80, 20);
tasks.run("Add activity log entries", 2, 30, 5);

const r = cl.run("Daily Start", "routines");
const cid = Number((r as any).lastInsertRowid ?? 1);
item.run(cid, "Open VSCode", 1);
item.run(cid, "Start servers", 2);
item.run(cid, "Clear inbox", 3);

console.log("Seed data inserted.");
