const Database = require("better-sqlite3");
const db = new Database("app.db");
const uid = (db.prepare("SELECT user_id AS uid FROM users ORDER BY user_id LIMIT 1").get()||{uid:1}).uid;
db.prepare(`INSERT INTO tasks (user_id,title,description,priority,xp_reward,coin_reward,created_at,is_active)
            VALUES (?,?,?,?,?,?,datetime('now'),1)`)
  .run(uid, "DIRECT TEST", "DB can store description", 3, 0, 0);
const row = db.prepare("SELECT task_id,title,description FROM tasks ORDER BY task_id DESC LIMIT 1").get();
console.log(row);
