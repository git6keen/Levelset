const fs = require("fs");
const p = "./server.ts";
let s = fs.readFileSync(p,"utf8");

// In POST /api/tasks, make description fallback to X-Desc if body description is missing
s = s.replace(
  /const description = b\.description == null \? null : String\(b\.description\);/,
  `const headerDesc = (req.get ? req.get("X-Desc") : (req.headers && (req.headers["x-desc"] as any))) as string | undefined;
   const description = (b.description != null && String(b.description).length > 0)
     ? String(b.description)
     : (headerDesc != null && String(headerDesc).length > 0 ? String(headerDesc) : null);`
);

// (Optional) brief log so we can see what the server will insert, then continue
if (!/INSERT ARGS/.test(s)) {
  s = s.replace(
    /\)\.run\(uid,\s*title,\s*description,\s*priority,\s*xp,\s*coins\)\s*;/,
    `).run(uid, title, description, priority, xp, coins);
     try { console.log("INSERT ARGS ?", { title, description, priority, xp, coins }); } catch {}`
  );
}

fs.writeFileSync(p,s,"utf8");
console.log("? server.ts now uses X-Desc header as a fallback for description");
