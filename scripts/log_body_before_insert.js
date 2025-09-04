const fs = require("fs"); const p="./server.ts";
let s = fs.readFileSync(p,"utf8");
s = s.replace(
  /exec\(\s*`\s*INSERT INTO tasks\s*\(/,
  'console.log("POST /api/tasks recv ?", req.body);\\n$&'
);
fs.writeFileSync(p,s,"utf8");
console.log("? added server log just before INSERT");
