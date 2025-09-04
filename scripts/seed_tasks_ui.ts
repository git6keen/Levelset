import Database from "better-sqlite3";
const db = new Database("./app.db");
const ins = db.prepare("INSERT INTO tasks_api (title, priority, xp, coins) VALUES (?, ?, ?, ?)");
ins.run("Wire up backend in TS", 3, 50, 10);
ins.run("Build inline checklist editor", 4, 80, 20);
ins.run("Add activity log entries", 2, 30, 5);
console.log("Seeded 3 tasks via tasks_api view.");
