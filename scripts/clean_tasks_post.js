const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

// 1) Delete any leftover lines that still insert via tasks_api (old path that drops description)
s = s.replace(/\s*exec\(\s*["']INSERT INTO\s+tasks_api[^;]*;\s*/gis, ""); // rare case with semicolon
s = s.replace(/\s*exec\(\s*["']INSERT INTO\s+tasks_api[\s\S]*?\)\s*;?\s*/gi, "");

// Also delete dangling "res.json({ ok: true });" + stray closing "});" that may trail those inserts
s = s.replace(/\s*res\.json\(\s*\{\s*ok\s*:\s*true\s*\}\s*\)\s*;\s*\}\);\s*/gi, "");

// 2) Normalize POST /api/tasks to the canonical, description-aware handler
s = s.replace(
  /app\.post\(["']\/api\/tasks["'][\s\S]*?\}\);\s*/m,
`app.post("/api/tasks", (req, res) => {
  try {
    const b = req.body || {};
    const title = (b.title ?? "").toString();
    if (!title.trim()) return res.status(400).send("title is required");
    const description = b.description == null ? null : String(b.description);
    const priority = Number(b.priority ?? 3);
    const xp = Number(b.xp ?? 0);
    const coins = Number(b.coins ?? 0);

    const row = db.prepare("SELECT user_id AS uid FROM users ORDER BY user_id LIMIT 1").get() || { uid: 1 };
    const uid = row.uid ?? 1;

    db.prepare(\`
      INSERT INTO tasks (user_id, title, description, priority, xp_reward, coin_reward, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)
    \`).run(uid, title, description, priority, xp, coins);

    res.json({ ok: true });
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});\n`
);

// 3) Save
fs.writeFileSync(p, s, "utf8");
console.log("? Cleaned stray tasks_api insert and reset POST /api/tasks to description-aware handler");
