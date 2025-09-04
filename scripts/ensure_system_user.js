const Database = require("better-sqlite3");
const db = new Database("app.db");
db.pragma("foreign_keys = ON");
db.exec(`
INSERT OR IGNORE INTO users(user_id, username, display_name, created_at)
VALUES (1, 'system', 'System', datetime('now'));
`);
console.log("? system user ensured (id=1)");
