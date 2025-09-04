const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");

/* 1) Remove ANY leftover "INSERT INTO tasks_api(...)" calls anywhere */
s = s.replace(/exec\(\s*["']INSERT\s+INTO\s+tasks_api[\s\S]*?\)\s*;?\s*/gi, "");

/* 2) Replace POST /api/tasks with a single, base-table insert that includes description */
s = s.replace(
  /app\.post\(["']\/api\/tasks["'][\s\S]*?\}\);\s*/m,
`app.post("/api/tasks", (req, res) => {
  try {
    console.log("ROUTE /api/tasks v4");
    const b = req.body || {};
    const title = (b.title ?? "").toString();
    if (!title.trim()) return res.status(400).send("title is required");
    const description = b.description != null && String(b.description).length > 0 ? String(b.description) : null;
    const priority = Number(b.priority ?? 3);
    const xp = Number(b.xp ?? 0);
    const coins = Number(b.coins ?? 0);

    const row = db.prepare("SELECT user_id AS uid FROM users ORDER BY user_id LIMIT 1").get() || { uid: 1 };
    const uid = row.uid ?? 1;

    console.log("INSERT ARGS =>", { title, description, priority, xp, coins });
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

/* 3) Replace GET /api/tasks with a base-table SELECT that returns task_id + description */
s = s.replace(
  /app\.get\(["']\/api\/tasks["'][\s\S]*?\}\);\s*/m,
`app.get("/api/tasks", (req, res) => {
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
});\n`
);

/* 4) Save */
fs.writeFileSync(p, s, "utf8");
console.log("? server.ts cleaned: legacy tasks_api insert removed; POST/GET normalized to base table with description.");
