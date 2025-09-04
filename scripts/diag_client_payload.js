const fs = require("fs");
const p = "./api.ts";
let s = fs.readFileSync(p,"utf8");
s = s.replace(
/export async function createTask\([\s\S]*?\)\s*:\s*Promise<void>\s*\{[\s\S]*?body:\s*JSON\.stringify\(input\),\s*\}\);\s*if\s*\(!r\.ok\)/m,
match => match.replace(
  "body: JSON.stringify(input),",
  `body: JSON.stringify(input),
   // diag: log what we’re sending
   ...(console.log("createTask payload ?", input), {}),`
));
fs.writeFileSync(p,s,"utf8");
console.log("? api.ts now logs the payload for createTask");
