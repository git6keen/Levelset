import Database from "better-sqlite3";
const db = new Database("./app.db"); db.pragma("foreign_keys=ON");
function exec(s:string,p:any[]=[]){ db.prepare(s).run(...p); }

exec(`CREATE TABLE IF NOT EXISTS renown_groups (group_id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE)`);
exec(`CREATE TABLE IF NOT EXISTS renown_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES renown_groups(group_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL, reason TEXT, source_type TEXT, source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
exec(`CREATE INDEX IF NOT EXISTS idx_renown_ledger_time ON renown_ledger(created_at DESC)`);

exec(`CREATE TABLE IF NOT EXISTS earned_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, note TEXT, source_type TEXT, source_id INTEGER,
  granted_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
exec(`CREATE TABLE IF NOT EXISTS earned_reward_deltas (
  earned_id INTEGER NOT NULL REFERENCES earned_rewards(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES renown_groups(group_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL, PRIMARY KEY (earned_id, group_id)
)`);

exec(`INSERT OR IGNORE INTO renown_groups(group_id,name) VALUES
 ('self','Self'),('home','Home'),('work','Work'),('community','Community')`);

console.log("OK: renown tables present.");
