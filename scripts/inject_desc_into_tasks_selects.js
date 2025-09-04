const fs = require("fs");
const path = "./server.ts";
let s = fs.readFileSync(path, "utf8");

// Add "description" after "title" for every SELECT ... FROM tasks_api (multi-line safe)
s = s.replace(/SELECT\s+([\s\S]*?)\s+FROM\s+tasks_api/gi, (m, cols) => {
  // if description already present, leave it
  if (/\bdescription\b/i.test(cols)) return m;
  // inject after first standalone "title"
  const newCols = cols.replace(/\btitle\b/i, "title, description");
  return `SELECT ${newCols} FROM tasks_api`;
});

fs.writeFileSync(path, s, "utf8");
console.log("? Injected `description` into all SELECTs from tasks_api in server.ts");
