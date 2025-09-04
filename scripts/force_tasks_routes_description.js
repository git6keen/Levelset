const fs = require("fs");
const path = "./server.ts";
let s = fs.readFileSync(path, "utf8");

/** Replace POST /api/tasks handler to include description */
s = s.replace(
  /app\.post\(\s*['"]\/api\/tasks['"][\s\S]*?\}\s*\);/m,
  `app.post("/api/tasks", (req, res) => {
  try {
    const body = req.body || {};
    const title = (body.title ?? "").toString();
    const description = body.description == null ? null : String(body.description);
    const priority = Number(body.priority ?? 3);
    const xp = Number(body.xp ?? 0);
    const coins = Number(body.coins ?? 0);

    // Insert through the view (triggers map to base table)
    const stmt = db.prepare("INSERT INTO tasks_api (title, description, priority, xp, coins) VALUES (?,?,?,?,?)");
    stmt.run(title, description, priority, xp, coins);

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});`
);

/** Replace GET /api/tasks handler to always SELECT description and support q/priority/sort */
s = s.replace(
  /app\.get\(\s*['"]\/api\/tasks['"][\s\S]*?\}\s*\);/m,
  `app.get("/api/tasks", (req, res) => {
  try {
    const q = (req.query.q ?? "").toString().trim();
    const pr = req.query.priority != null && req.query.priority !== "" ? Number(req.query.priority) : undefined;
    const sort = (req.query.sort ?? "").toString();
    const allowedSort = new Set(["priority", "xp", "coins", "title", "created_at"]);
    const orderBy = allowedSort.has(sort) ? sort : "created_at";

    const where: string[] = [];
    const params: Record<string, any> = {};

    if (q) { where.push("title LIKE @q"); params.q = "%" + q + "%"; }
    if (Number.isFinite(pr)) { where.push("priority = @pr"); params.pr = pr; }

    let sql = "SELECT task_id AS task_id, title, description, priority, xp, coins, created_at FROM tasks_api";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY " + orderBy + (orderBy === "created_at" ? " DESC" : "");

    const rows = db.prepare(sql).all(params);
    res.json(rows);
  } catch (e) {
    console.error("API_ERR", e);
    res.status(500).send(String(e));
  }
});`
);

fs.writeFileSync(path, s, "utf8");
console.log("? server.ts: /api/tasks GET+POST replaced to handle description correctly");
