const fs = require("fs");
const path = "./server.ts";
let s = fs.readFileSync(path, "utf8");

/** Replace a route by method+path using brace matching */
function replaceRoute(src, method, routePath, newBlock) {
  const needles = [
    `app.${method}("${routePath}"`,
    `app.${method}('${routePath}'`,
  ];
  let start = -1;
  for (const n of needles) {
    start = src.indexOf(n);
    if (start !== -1) break;
  }
  if (start === -1) return src; // not found

  // Find the first "{" after the method/path signature (handler block start)
  const openIdx = src.indexOf("{", start);
  if (openIdx === -1) return src;

  // Walk to find the matching closing "});"
  let i = openIdx, depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        // Expect following chars to close the route with ");
        const after = src.indexOf(");", i);
        if (after === -1) return src;
        const blockStart = src.lastIndexOf("app.", start); // beginning of app.<method>(
        const blockEnd = after + 2;
        const before = src.slice(0, blockStart);
        const afterStr = src.slice(blockEnd);
        return before + newBlock + afterStr;
      }
    }
    i++;
  }
  return src;
}

// New POST /api/tasks (saves description to base table, satisfies FK with existing user)
const NEW_POST = `
app.post("/api/tasks", (req, res) => {
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
});`;

// New GET /api/tasks (returns description)
const NEW_GET = `
app.get("/api/tasks", (req, res) => {
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
});`;

let s1 = replaceRoute(s, "post", "/api/tasks", NEW_POST);
s1 = replaceRoute(s1, "get", "/api/tasks", NEW_GET);

// If not found (unusual formatting), append at end to guarantee presence
if (!/app\.post\(["']\/api\/tasks["']/.test(s1)) s1 += "\n" + NEW_POST + "\n";
if (!/app\.get\(["']\/api\/tasks["']/.test(s1)) s1 += "\n" + NEW_GET + "\n";

fs.writeFileSync(path, s1, "utf8");
console.log("? server.ts: /api/tasks POST+GET replaced with description-aware handlers");
