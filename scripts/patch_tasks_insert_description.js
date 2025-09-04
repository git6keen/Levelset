const fs = require("fs");
const path = "./server.ts";
let s = fs.readFileSync(path, "utf8");

// 1) Ensure the INSERT includes description in the column list
s = s.replace(
  /INSERT\s+INTO\s+tasks_api\s*\(\s*title\s*,\s*priority\s*,\s*xp\s*,\s*coins\s*\)\s*VALUES\s*\(\s*\?,\s*\?,\s*\?,\s*\?\s*\)/gi,
  "INSERT INTO tasks_api (title, description, priority, xp, coins) VALUES (?,?,?,?,?)"
);

// 2) Fix the .run(...) arguments to pass description between title and priority.
//    Pattern: .run(req.body.title, req.body.priority, req.body.xp, req.body.coins)
s = s.replace(
  /\.run\(\s*req\.body\.title\s*,\s*req\.body\.priority[^,]*,\s*req\.body\.xp[^,]*,\s*req\.body\.coins[^)]*\)/gi,
  ".run(req.body.title, (req.body.description ?? null), (req.body.priority ?? 3), (req.body.xp ?? 0), (req.body.coins ?? 0))"
);

fs.writeFileSync(path, s, "utf8");
console.log("? server.ts: POST /api/tasks now inserts description");
