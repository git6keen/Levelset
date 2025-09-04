const fs = require("fs");
const p = "./TasksPage.tsx";
let s = fs.readFileSync(p,"utf8");

// remove the immediate PATCH we added; keep simple create -> reload
s = s.replace(
/await createTask\(payload\);[\s\S]*?setStatus\("Task created"\);/m,
`await createTask(payload);
      await load();
      setStatus("Task created");`
);

// also drop the helper import if present
s = s.replace(/import\s*\{\s*patchTask\s*\}\s*from\s*"\.\/api";\s*\n?/g, "");

fs.writeFileSync(p,s,"utf8");
console.log("? Removed PATCH-after-create from TasksPage.tsx");
