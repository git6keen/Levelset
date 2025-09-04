const fs = require("fs"); const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");
s = s.replace(/const b = req\.body \|\| \{\};/, `const b = req.body || {}; console.log("POST /api/tasks body ?", b);`);
fs.writeFileSync(p,s,"utf8"); console.log("Added POST body log.");
