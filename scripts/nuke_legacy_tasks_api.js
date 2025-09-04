const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");
s = s.replace(/exec\(\s*["']INSERT\s+INTO\s+tasks_api[\s\S]*?\)\s*;?\s*/gi, "");
fs.writeFileSync(p,s,"utf8");
console.log("? Removed legacy tasks_api inserts");
