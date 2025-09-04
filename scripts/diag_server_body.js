const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");

// Log the raw body right after it’s read
s = s.replace(
  /const b = req\.body \|\| \{\};/,
  `const b = req.body || {};
   console.log("POST /api/tasks body:", JSON.stringify(req.body));`
);

// Log the final values right before the INSERT .run(...)
s = s.replace(
  /(\)\.run\()\s*uid,\s*title,\s*description,\s*priority,\s*xp,\s*coins\s*(\)\))/,
  (m, pre, post) => `${pre}uid, title, description, priority, xp, coins${post};\n    console.log("INSERT ARGS ?", { title, description, priority, xp, coins });`
);

fs.writeFileSync(p,s,"utf8");
console.log("? server.ts now logs POST body and INSERT args");
