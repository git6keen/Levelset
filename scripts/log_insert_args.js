const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");

// Add a guaranteed log right where the INSERT happens.
// If it's already present, this keeps only one copy.
s = s.replace(/\.run\(uid,\s*title,\s*description,\s*priority,\s*xp,\s*coins\)\s*;?/,
  ').run(uid, title, description, priority, xp, coins);\nconsole.log("INSERT ARGS =>", {title, description, priority, xp, coins});');

fs.writeFileSync(p,s,"utf8");
console.log("? server.ts now prints INSERT ARGS for /api/tasks");
