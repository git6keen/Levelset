const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

// Remove any leftover tasks_api inserts (the legacy path that drops description)
s = s.replace(/exec\(\s*["']INSERT\s+INTO\s+tasks_api[\s\S]*?\)\s*;?\s*/gi, "");

// Remove a stray "res.json({ ok: true });" that may follow that block
s = s.replace(/\s*res\.json\(\s*\{\s*ok\s*:\s*true\s*\}\s*\)\s*;\s*\}\);\s*/gi, "");

// Keep your single, good POST /api/tasks (the one inserting into base table with description)
fs.writeFileSync(p, s, "utf8");
console.log("? Removed stray tasks_api insert; only the correct POST /api/tasks remains.");
