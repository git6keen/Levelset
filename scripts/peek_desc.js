const Database = require("better-sqlite3");
const db = new Database("app.db");
const rows = db.prepare("SELECT task_id,title,description,priority,created_at FROM tasks ORDER BY task_id DESC LIMIT 3").all();
console.log(rows);
