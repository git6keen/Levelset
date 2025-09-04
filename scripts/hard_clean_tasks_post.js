const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

// Find the first POST /api/tasks block using brace matching.
function findBlock(src, needle) {
  const startSigA = `app.post("${needle}"`;
  const startSigB = `app.post('${needle}'`;
  let start = src.indexOf(startSigA);
  if (start < 0) start = src.indexOf(startSigB);
  if (start < 0) throw new Error(`Route ${needle} not found`);

  const braceStart = src.indexOf("{", start);
  if (braceStart < 0) throw new Error("Handler brace not found");

  let i = braceStart, depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const close = src.indexOf(");", i);
        if (close < 0) throw new Error("Route terminator not found");
        return { blockStart: src.lastIndexOf("app.", start), blockEnd: close + 2 };
      }
    }
    i++;
  }
  throw new Error("Unbalanced braces");
}

const { blockStart, blockEnd } = findBlock(s, "/api/tasks");

// From the end of that POST block, nuke any stray lines up to the next route "app."
let after = s.slice(blockEnd);
const nextRoute = after.indexOf("app.");
const tailStart = nextRoute >= 0 ? nextRoute : after.length;
const cleanedTail = after.slice(tailStart);

// New, canonical POST block (writes description to base table)
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

// Reassemble: [head] + NEW_POST + [cleaned tail]
const head = s.slice(0, blockStart);
const out = head + NEW_POST + "\n\n" + cleanedTail;

// As an extra safety, strip any lingering tasks_api INSERTs anywhere in file.
const out2 = out.replace(/INSERT\s+INTO\s+tasks_api[\s\S]*?\)\s*;?/gi, "");

fs.writeFileSync(p, out2, "utf8");
console.log("? Cleaned stray code after POST /api/tasks and reset handler to description-aware version.");
