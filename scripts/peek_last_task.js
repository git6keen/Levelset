const Database = require("better-sqlite3");
const db = new Database("app.db");
const row = db.prepare(`
  SELECT task_id, title, description, priority, xp_reward AS xp, coin_reward AS coins, created_at
  FROM tasks
  ORDER BY task_id DESC
  LIMIT 1
`).get();
console.log(row);
