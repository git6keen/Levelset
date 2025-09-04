const Database = require("better-sqlite3");
const db = new Database("app.db");
db.pragma("foreign_keys = ON");

const sql = `
DROP TRIGGER IF EXISTS tasks_api_insert;
DROP VIEW IF EXISTS tasks_api;

-- Read shape expected by the UI/API
CREATE VIEW tasks_api AS
SELECT
  task_id,
  title,
  priority,
  xp_reward    AS xp,
  coin_reward  AS coins,
  created_at
FROM tasks
WHERE is_active = 1;

-- When the API inserts into tasks_api, route it into tasks with defaults
CREATE TRIGGER tasks_api_insert
INSTEAD OF INSERT ON tasks_api
BEGIN
  INSERT INTO tasks (user_id, title, priority, xp_reward, coin_reward, created_at)
  VALUES (1,
          NEW.title,
          COALESCE(NEW.priority, 3),
          COALESCE(NEW.xp, 0),
          COALESCE(NEW.coins, 0),
          datetime('now'));
END;
`;

db.exec(sql);
console.log("? tasks_api view + insert trigger installed");
