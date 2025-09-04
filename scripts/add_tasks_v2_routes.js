const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

// Append new v2 routes (do not rely on replacing existing code)
if (!/app\.post\(\s*["']\/api\/tasks2["']/.test(s)) {
  s += `

// ===== tasks v2 (direct base table, with description) =====
app.post("/api/tasks2", (req, res) => {
  try {
    const b = req.body || {};
    const title = (b.title ?? "").toString();
    if (!title.trim()) return res.status(400).send("title is required");
    const description = b.description == null ? null : String(b.description);
    const priority = Number(b.priority ?? 3);
    const xp = Number(b.xp ?? 0);
    const coins = Number(b.coins ?? 0);

    const uidRow = db.prepare("SELECT user_id AS uid FROM users ORDER BY user_id LIMIT 1").get() || { uid: 1 };
    const uid = uidRow.uid ?? 1;

    db.prepare(\`
      INSERT INTO tasks (user_id, title, description, priority, xp_reward, coin_reward, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)
    \`).run(uid, title, description, priority, xp, coins);

    res.json({ ok: true });
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});

app.get("/api/tasks2", (req, res) => {
  try {
    const q = (req.query.q ?? "").toString().trim();
    const pr = req.query.priority != null && req.query.priority !== "" ? Number(req.query.priority) : undefined;
    const sort = (req.query.sort ?? "").toString();
    const allowed = new Set(["priority","title","created_at"]);
    const orderBy = allowed.has(sort) ? sort : "created_at";

    const where = ["is_active = 1"];
    const params = {};
    if (q) { where.push("title LIKE @q"); params["q"] = "%" + q + "%"; }
    if (Number.isFinite(pr)) { where.push("priority = @pr"); params["pr"] = pr; }

    const rows = db.prepare(\`
      SELECT
        task_id           AS task_id,
        title,
        description,
        priority,
        xp_reward         AS xp,
        coin_reward       AS coins,
        created_at
      FROM tasks
      WHERE \${where.join(" AND ")}
      ORDER BY \${orderBy} \${orderBy === "created_at" ? "DESC" : "ASC"}
    \`).all(params);

    res.json(rows);
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});
// ===== end tasks v2 =====
`;
  fs.writeFileSync(p, s, "utf8");
  console.log("? server.ts appended tasks v2 routes");
} else {
  console.log("? tasks v2 routes already present");
}
