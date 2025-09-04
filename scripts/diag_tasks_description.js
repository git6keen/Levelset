const fs = require("fs");
const Database = require("better-sqlite3");

// --- 1) Show the active route code in server.ts (so we know what it's inserting/selecting)
function extractRoute(src, method, routePath){
  const options = [`app.${method}("${routePath}"`,`app.${method}('${routePath}'`];
  let start = -1;
  for (const o of options){ const i = src.indexOf(o); if (i !== -1){ start = i; break; } }
  if (start === -1) return `NOT FOUND: app.${method}(${routePath})`;
  let open = src.indexOf("{", start); if (open === -1) return "BAD FORMAT";
  let i = open, depth = 0;
  while (i < src.length){
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}"){
      depth--;
      if (depth === 0){
        const end = src.indexOf(");", i);
        const blockStart = src.lastIndexOf("app.", start);
        const block = src.slice(blockStart, end + 2);
        return block;
      }
    }
    i++;
  }
  return "FAILED TO PARSE";
}

const server = fs.readFileSync("./server.ts","utf8");
console.log("=== ROUTE: POST /api/tasks ===");
console.log(extractRoute(server, "post", "/api/tasks"));
console.log("\n=== ROUTE: GET /api/tasks ===");
console.log(extractRoute(server, "get", "/api/tasks"));

// --- 2) Show current view + triggers for tasks_api (so we know what DB expects)
const db = new Database("app.db");
const rows = db.prepare(`
  SELECT type, name, sql
  FROM sqlite_master
  WHERE name IN ('tasks_api', 'tasks_api_insert', 'tasks_api_update', 'tasks_api_delete')
  ORDER BY type, name
`).all();
console.log("\n=== SQLITE MASTER (tasks_api + triggers) ===");
for (const r of rows){
  console.log(`\n-- ${r.type} ${r.name}\n${r.sql}\n`);
}

// --- 3) Show last 3 raw tasks rows (title/description)
const peek = db.prepare(`SELECT task_id, title, description, priority, created_at FROM tasks ORDER BY task_id DESC LIMIT 3`).all();
console.log("=== LAST 3 TASKS (raw table) ===");
console.log(peek);

// --- 4) Ask the running API what it returns (no restart)
async function probe(){
  try{
    const res = await fetch("http://127.0.0.1:8001/api/tasks");
    const data = await res.json();
    console.log("\\n=== /api/tasks (first 2 rows) ===");
    console.log((data || []).slice(0,2));
  }catch(e){
    console.log("\\n=== /api/tasks PROBE FAILED ===");
    console.log(String(e));
  }
}
probe();
