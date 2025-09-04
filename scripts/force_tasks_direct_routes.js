const fs = require("fs");
const path = "./server.ts";
let s = fs.readFileSync(path, "utf8");

// Hard-replace POST /api/tasks with a direct INSERT into base table (includes description)
s = s.replace(
  /app\.post\(\s*['"]\/api\/tasks['"][\s\S]*?\}\s*\);/m,
`app.post("/api/tasks", (req, res) => {
  try {
    const body = req.body || {};
    const title = (body.title ?? "").toString();
    if (!title.trim()) return res.status(400).send("title is required");
    const description = body.description == null ? null : String(body.description);
    const priority = Number(body.priority ?? 3);
    const xp = Number(body.xp ?? 0);
    const coins = Number(body.coins ?? 0);

    // pick an existing user_id (or 1) to satisfy FK
    const uidRow = db.prepare("SELECT user_id AS uid FROM users ORDER BY user_id LIMIT 1").get() || { uid: 1 };
    const uid = uidRow.uid ?? 1;

    db.prepare(`
      INSERT INTO tasks (user_id, title, description, priority, xp_reward, coin_reward, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)
    `).run(uid, title, description, priority, xp, coins);

    res.json({ ok: true });
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});`
);

// Hard-replace GET /api/tasks with a direct SELECT from base table (returns description)
s = s.replace(
  /app\.get\(\s*['"]\/api\/tasks['"][\s\S]*?\}\s*\);/m,
`app.get("/api/tasks", (req, res) => {
  try {
    const q = (req.query.q ?? "").toString().trim();
    const pr = req.query.priority != null && req.query.priority !== "" ? Number(req.query.priority) : undefined;
    const sort = (req.query.sort ?? "").toString();
    const allowed = new Set(["priority","title","created_at"]);
    const orderBy = allowed.has(sort) ? sort : "created_at";

    const where: string[] = ["is_active = 1"];
    const params: Record<string, any> = {};

    if (q) { where.push("title LIKE @q"); params.q = "%" + q + "%"; }
    if (Number.isFinite(pr)) { where.push("priority = @pr"); params.pr = pr; }

    let sql = `
      SELECT
        task_id           AS task_id,
        title,
        description,
        priority,
        xp_reward         AS xp,
        coin_reward       AS coins,
        created_at
      FROM tasks
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy} ${orderBy === "created_at" ? "DESC" : "ASC"}
    `;
    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});`
);

fs.writeFileSync(path, s, "utf8");
console.log("? server.ts /api/tasks now uses base table, includes description on POST+GET");
