import Database from "better-sqlite3";
const db = new Database("./app.db");
db.pragma("foreign_keys = ON");

/* ---------- TASKS: view exposing (id,title,priority,xp,coins,created_at,is_active) ---------- */
db.exec(`
CREATE VIEW IF NOT EXISTS tasks_api AS
SELECT
  task_id    AS id,
  title,
  priority,
  xp_reward  AS xp,
  coin_reward AS coins,
  created_at,
  is_active
FROM tasks;

CREATE TRIGGER IF NOT EXISTS tasks_api_insert
INSTEAD OF INSERT ON tasks_api
BEGIN
  INSERT INTO tasks (user_id, title, priority, xp_reward, coin_reward, created_at, is_active)
  VALUES (NULL, NEW.title, COALESCE(NEW.priority,3), COALESCE(NEW.xp,0), COALESCE(NEW.coins,0), COALESCE(NEW.created_at, datetime('now')), COALESCE(NEW.is_active,1));
END;

CREATE TRIGGER IF NOT EXISTS tasks_api_update
INSTEAD OF UPDATE ON tasks_api
BEGIN
  UPDATE tasks SET
    title       = COALESCE(NEW.title, title),
    priority    = COALESCE(NEW.priority, priority),
    xp_reward   = COALESCE(NEW.xp, xp_reward),
    coin_reward = COALESCE(NEW.coins, coin_reward),
    is_active   = COALESCE(NEW.is_active, is_active)
  WHERE task_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS tasks_api_delete
INSTEAD OF DELETE ON tasks_api
BEGIN
  DELETE FROM tasks WHERE task_id = OLD.id;
END;
`);

/* ---------- CHECKLISTS: (id,name,category,created_at) ---------- */
db.exec(`
CREATE VIEW IF NOT EXISTS checklists_api AS
SELECT
  checklist_id AS id,
  name,
  category,
  created_at
FROM checklists;

CREATE TRIGGER IF NOT EXISTS checklists_api_insert
INSTEAD OF INSERT ON checklists_api
BEGIN
  INSERT INTO checklists (user_id, name, category, created_at)
  VALUES (NULL, NEW.name, NEW.category, COALESCE(NEW.created_at, datetime('now')));
END;

CREATE TRIGGER IF NOT EXISTS checklists_api_update
INSTEAD OF UPDATE ON checklists_api
BEGIN
  UPDATE checklists SET
    name     = COALESCE(NEW.name, name),
    category = COALESCE(NEW.category, category)
  WHERE checklist_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS checklists_api_delete
INSTEAD OF DELETE ON checklists_api
BEGIN
  DELETE FROM checklists WHERE checklist_id = OLD.id;
END;
`);

/* ---------- CHECKLIST ITEMS: (id,checklist_id,text,done,position) ---------- */
db.exec(`
CREATE VIEW IF NOT EXISTS checklist_items_api AS
SELECT
  item_id       AS id,
  checklist_id,
  text,
  completed     AS done,
  position
FROM checklist_items;

CREATE TRIGGER IF NOT EXISTS checklist_items_api_insert
INSTEAD OF INSERT ON checklist_items_api
BEGIN
  INSERT INTO checklist_items (checklist_id, text, completed, position)
  VALUES (NEW.checklist_id, NEW.text, CASE WHEN NEW.done IS NULL THEN 0 ELSE NEW.done END, COALESCE(NEW.position, 0));
END;

CREATE TRIGGER IF NOT EXISTS checklist_items_api_update
INSTEAD OF UPDATE ON checklist_items_api
BEGIN
  UPDATE checklist_items SET
    text      = COALESCE(NEW.text, text),
    completed = COALESCE(NEW.done, completed),
    position  = COALESCE(NEW.position, position)
  WHERE item_id = OLD.id AND checklist_id = OLD.checklist_id;
END;

CREATE TRIGGER IF NOT EXISTS checklist_items_api_delete
INSTEAD OF DELETE ON checklist_items_api
BEGIN
  DELETE FROM checklist_items WHERE item_id = OLD.id AND checklist_id = OLD.checklist_id;
END;
`);

console.log("API compatibility views + triggers installed.");
