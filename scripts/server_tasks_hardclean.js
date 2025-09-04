const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

/** 1) Remove ANY leftover "INSERT INTO tasks_api(...)" blocks (and their trailing res.json) */
s = s.replace(/exec\(\s*["']INSERT\s+INTO\s+tasks_api[\s\S]*?\)\s*;?\s*/gi, "");
s = s.replace(/\s*res\.json\(\s*\{\s*ok\s*:\s*true\s*\}\s*\)\s*;\s*/gi, "");

/** 2) Replace the entire POST /api/tasks block with a single canonical version that writes to base table and logs */
function replaceRoute(src, method, routePath, newBlock) {
  const needles = [`app.${method}("${routePath}"`, `app.${method}('${routePath}'`];
  let start = -1;
  for (const n of needles) { const i = src.indexOf(n); if (i !== -1) { start = i; break; } }
  if (start === -1) return src + "\n" + newBlock + "\n";
  const open = src.indexOf("{", start);
  if (open === -1) return src;
  let i = open, depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { const end = src.indexOf(");", i); if (end !== -1) {
      return src.slice(0, src.lastIndexOf("app.", start)) + newBlock + src.slice(end + 2);
    } } }
    i++;
  }
  return src;
}

const POST_TASKS = `
app.post("/api/tasks", (req, res) => {
  try {
    console.log("HIT /api/tasks v3");
    const b = req.body || {};
    const title = (b.title ?? "").toString();
    if (!title.trim()) return res.status(400).send("title is required");

    const descriptionRaw = b.description;
    const headerDesc = (req.get ? req.get("X-Desc") : (req.headers && (req.headers["x-desc"]))); // fallback
    const description = (descriptionRaw != null && String(descriptionRaw).length > 0)
      ? String(descriptionRaw)
      : (headerDesc && String(headerDesc).length > 0 ? String(headerDesc) : null);

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
});`;

s = replaceRoute(s, "post", "/api/tasks", POST_TASKS);

/** 3) Save */
fs.writeFileSync(p, s, "utf8");
console.log("? server.ts cleaned (removed tasks_api inserts) and POST /api/tasks reset with logging.");
