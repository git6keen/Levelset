const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p, "utf8");

// A) Ensure PATCH route reads b.description
s = s.replace(
  /(app\.patch\(\s*["']\/api\/tasks\/:id["'][\s\S]*?\{\s*const b = req\.body as any;)/m,
  `$1 const description = b?.description;`
);

// B) Allow setting "description" in the SET list
// Insert after the "title" block, if not present already
if (!/description\s*=\s*\?/i.test(s)) {
  s = s.replace(
    /(if\s*\(\s*title\s*!==\s*undefined\s*\)\s*\{\s*sets\.push\("title\s*=\s*\\?"\);\s*params\.push\(capStr\(title,\s*\d+\)\);\s*\}\s*)/m,
    `$1
    if (description !== undefined) { sets.push("description = ?"); params.push(capStr(description, 2000)); }
    `
  );
}

// C) Ensure UPDATE still uses tasks_api (so triggers keep working)
s = s.replace(
  /UPDATE\s+tasks_api\s+SET\s+\$\{sets\.join\(", "\)\}\s+WHERE\s+id\s*=\s*\?/m,
  `UPDATE tasks_api SET \${sets.join(", ")} WHERE id = ?`
);

fs.writeFileSync(p, s, "utf8");
console.log("? server.ts: PATCH /api/tasks/:id now accepts { description }");
