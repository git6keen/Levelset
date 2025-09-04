/**
 * scripts/install_rewards_renown.ts
 * Idempotent: safe to re-run.
 */
import Database from "better-sqlite3";

const db = new Database("app.db");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS renown_groups (
  group_id   TEXT PRIMARY KEY,      -- slug like 'community'
  name       TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS renown_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   TEXT NOT NULL REFERENCES renown_groups(group_id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,
  reason     TEXT,
  source_type TEXT,                 -- 'task' | 'quest' | 'manual' | ...
  source_id  INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_renown_ledger_group_time ON renown_ledger(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reward_grants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  note       TEXT,
  source_type TEXT,
  source_id  INTEGER,
  granted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_grant_deltas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_id  INTEGER NOT NULL REFERENCES reward_grants(id) ON DELETE CASCADE,
  group_id  TEXT NOT NULL REFERENCES renown_groups(group_id) ON DELETE CASCADE,
  delta     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grant_deltas_grant ON reward_grant_deltas(grant_id);
`);

console.log("OK: rewards/renown tables present");
