import Database from "better-sqlite3";

const db = new Database("./app.db");
db.pragma("foreign_keys = ON");

function exec(sql: string) { db.prepare(sql).run(); }

exec(`
CREATE TABLE IF NOT EXISTS quest_lines (
  quest_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  summary     TEXT,
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'done'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

exec(`
CREATE TABLE IF NOT EXISTS quest_steps (
  step_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id     INTEGER NOT NULL REFERENCES quest_lines(quest_id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  order_index  INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'open', -- 'open' | 'done'
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
exec(`CREATE INDEX IF NOT EXISTS idx_qsteps_q ON quest_steps(quest_id);`);

exec(`
CREATE TABLE IF NOT EXISTS quest_step_links (
  step_id  INTEGER NOT NULL REFERENCES quest_steps(step_id) ON DELETE CASCADE,
  task_id  INTEGER NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  PRIMARY KEY (step_id, task_id)
);
`);
exec(`CREATE INDEX IF NOT EXISTS idx_qstep_links_task ON quest_step_links(task_id);`);

/* When a task gets completed, mark any linked steps "done".
   If all steps in that quest are done, mark the quest "done". */
exec(`
CREATE TRIGGER IF NOT EXISTS trg_task_completion_mark_step
AFTER INSERT ON task_completions
BEGIN
  UPDATE quest_steps
     SET status = 'done'
   WHERE step_id IN (SELECT step_id FROM quest_step_links WHERE task_id = NEW.task_id);

  UPDATE quest_lines
     SET status = 'done'
   WHERE quest_id IN (
     SELECT s.quest_id
       FROM quest_steps s
      WHERE s.step_id IN (SELECT step_id FROM quest_step_links WHERE task_id = NEW.task_id)
   )
   AND NOT EXISTS (
     SELECT 1 FROM quest_steps s2
      WHERE s2.quest_id = quest_lines.quest_id AND s2.status <> 'done'
   );
END;
`);

console.log("OK: quest schema installed.");
