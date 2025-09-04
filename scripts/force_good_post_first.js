const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");

// build canonical POST handler (direct to base table, includes description)
const GOOD_POST = `
app.post("/api/tasks", (req, res) => {
  try {
    const b = req.body || {};
    const title = (b.title ?? "").toString().trim();
    if (!title) return res.status(400).send("title is required");
    const description = (b.description != null && String(b.description).length > 0) ? String(b.description) : null;
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
});`;

// 1) Cut any existing POST /api/tasks blocks (we’ll reinsert one clean copy)
s = s.replace(/app\.post\(["']\/api\/tasks["'][\s\S]*?\}\);\s*/gm, "");

// 2) Insert the good POST immediately after DB pragmas so it runs before other routes
const anchor = s.indexOf('db.pragma("foreign_keys = ON")');
if (anchor !== -1) {
  const insertAt = s.indexOf("\n", anchor) + 1;
  s = s.slice(0, insertAt) + "\n" + GOOD_POST + "\n\n" + s.slice(insertAt);
} else {
  // fallback: prepend near top (after express.json if present)
  const ej = s.indexOf("app.use(express.json()");
  const pos = ej !== -1 ? s.indexOf("\n", ej) + 1 : 0;
  s = s.slice(0, pos) + "\n" + GOOD_POST + "\n\n" + s.slice(pos);
}

fs.writeFileSync(p, s, "utf8");
console.log("? Inserted canonical POST /api/tasks right after DB init (wins by order)");
