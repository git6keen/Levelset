const Database = require("better-sqlite3");
const db = new Database("app.db");
db.pragma("foreign_keys = ON");

const sql = `
BEGIN;

-- Rebuild view + triggers to include description
DROP TRIGGER IF EXISTS tasks_api_insert;
DROP TRIGGER IF EXISTS tasks_api_update;
DROP TRIGGER IF EXISTS tasks_api_delete;
DROP VIEW IF EXISTS tasks_api;

CREATE VIEW tasks_api AS
SELECT
  task_id            AS id,      -- legacy/compat
  task_id,
  title,
  description,                   -- <— now exposed
  priority,
  xp_reward   AS xp,
  coin_reward AS coins,
  created_at
FROM tasks
WHERE is_active = 1;

CREATE TRIGGER tasks_api_insert
INSTEAD OF INSERT ON tasks_api
BEGIN
  INSERT INTO tasks (user_id, title, description, priority, xp_reward, coin_reward, created_at, is_active)
  VALUES (
    COALESCE((SELECT user_id FROM users ORDER BY user_id LIMIT 1), 1),
    COALESCE(NEW.title, ''),
    COALESCE(NEW.description, NULL),
    COALESCE(NEW.priority, 3),
    COALESCE(NEW.xp, 0),
    COALESCE(NEW.coins, 0),
    datetime('now'),
    1
  );
END;

CREATE TRIGGER tasks_api_update
INSTEAD OF UPDATE ON tasks_api
BEGIN
  UPDATE tasks
     SET title       = COALESCE(NEW.title, title),
         description = COALESCE(NEW.description, description),
         priority    = COALESCE(NEW.priority, priority),
         xp_reward   = COALESCE(NEW.xp, xp_reward),
         coin_reward = COALESCE(NEW.coins, coin_reward)
   WHERE task_id = OLD.task_id;
END;

CREATE TRIGGER tasks_api_delete
INSTEAD OF DELETE ON tasks_api
BEGIN
  UPDATE tasks SET is_active = 0 WHERE task_id = OLD.task_id;
END;

COMMIT;
`;
db.exec(sql);
console.log("? tasks_api now includes description (view + triggers)");
