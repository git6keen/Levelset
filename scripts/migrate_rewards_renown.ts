import Database from "better-sqlite3";

const db = new Database("./app.db");
db.pragma("foreign_keys = ON");

// Renown groups
db.prepare(`
CREATE TABLE IF NOT EXISTS renown_groups (
  group_id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).run();

// Renown ledger
db.prepare(`
CREATE TABLE IF NOT EXISTS renown_ledger (
  ledger_id INTEGER PRIMARY KEY,
  group_id INTEGER NOT NULL,
  user_id INTEGER DEFAULT 1,
  delta INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES renown_groups(group_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
)`).run();

// Reward grants
db.prepare(`
CREATE TABLE IF NOT EXISTS reward_grants (
  grant_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  note TEXT,
  source_type TEXT,
  source_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).run();

// Grant deltas (link grants to renown deltas)
db.prepare(`
CREATE TABLE IF NOT EXISTS reward_grant_deltas (
  id INTEGER PRIMARY KEY,
  grant_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  FOREIGN KEY (grant_id) REFERENCES reward_grants(grant_id),
  FOREIGN KEY (group_id) REFERENCES renown_groups(group_id)
)`).run();

console.log("Migration complete: renown & rewards tables ensured.");
