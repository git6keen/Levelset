const Database = require("better-sqlite3");
const path = require("node:path");
const db = new Database("./app.db");
console.log("DB path:", path.resolve("./app.db"));
const cols = db.prepare("PRAGMA table_info(checklist_items)").all().map(x=>x.name);
console.log("checklist_items cols:", cols);
