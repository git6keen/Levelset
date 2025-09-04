const fs = require("fs");
const path = "./server.ts";
const src = fs.readFileSync(path, "utf8");

/** Find ALL route blocks for a given method+path using brace-matching */
function findAllRoutes(src, method, routePath){
  const hits = [];
  const needles = [`app.${method}("${routePath}"`,`app.${method}('${routePath}'`];
  let idx = 0;
  while (idx < src.length){
    let start = -1;
    for (const n of needles){
      const i = src.indexOf(n, idx);
      if (i !== -1 && (start === -1 || i < start)) start = i;
    }
    if (start === -1) break;
    const open = src.indexOf("{", start);
    if (open === -1) break;
    let i = open, depth = 0;
    while (i < src.length){
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}"){
        depth--;
        if (depth === 0){
          const end = src.indexOf(");", i);
          const blockStart = src.lastIndexOf("app.", start);
          const blockEnd = end + 2;
          hits.push(src.slice(blockStart, blockEnd));
          idx = blockEnd;
          break;
        }
      }
      i++;
    }
    if (depth !== 0) break;
  }
  return hits;
}

function grep(re, label){
  const out = [];
  const rx = new RegExp(re, "gi");
  let m;
  while ((m = rx.exec(src))) {
    const start = Math.max(0, m.index - 120);
    const end = Math.min(src.length, m.index + 200);
    out.push(src.slice(start, end));
  }
  console.log(`\n=== GREP ${label} (${out.length}) ===`);
  out.forEach((s,i)=>console.log(`\n--#${i+1}--\n${s}\n`));
}

const posts = findAllRoutes(src, "post", "/api/tasks");
const gets  = findAllRoutes(src, "get",  "/api/tasks");

console.log("=== FOUND POST /api/tasks ROUTES ===", posts.length);
posts.forEach((b,i)=>console.log(`\n-- POST #${i+1} --\n${b}\n`));

console.log("=== FOUND GET /api/tasks ROUTES  ===", gets.length);
gets.forEach((b,i)=>console.log(`\n-- GET #${i+1} --\n${b}\n`));

// Look for sanitizers that might drop description
grep("\\b(capStr|capNum|sanitize|pick\\(|omit\\(|z\\.object\\(|zod|schema|validator)","SANITIZERS");
grep("req\\.body\\s*=\\s*\\{","REQ.BODY REASSIGN");
grep("JSON\\.stringify\\(req\\.body","BODY LOG");
