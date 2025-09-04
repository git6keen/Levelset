const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

// Add description to common SELECT patterns against tasks_api
s = s.replace(/SELECT\s+id\s*,\s*title\s*,\s*priority\s*,\s*xp\s*,\s*coins\s*,\s*created_at\s+FROM\s+tasks_api/gi,
              "SELECT id,title,description,priority,xp,coins,created_at FROM tasks_api");

s = s.replace(/SELECT\s+task_id\s*,\s*title\s*,\s*priority\s*,\s*xp\s*,\s*coins\s*,\s*created_at\s+FROM\s+tasks_api/gi,
              "SELECT task_id,title,description,priority,xp,coins,created_at FROM tasks_api");

// Fallback: if a query omits id column
s = s.replace(/SELECT\s+title\s*,\s*priority\s*,\s*xp\s*,\s*coins\s*,\s*created_at\s+FROM\s+tasks_api/gi,
              "SELECT title,description,priority,xp,coins,created_at FROM tasks_api");

fs.writeFileSync(p, s, "utf8");
console.log("? server.ts patched to include description in /api/tasks SELECTs");
