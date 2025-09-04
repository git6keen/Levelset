const fs = require("fs");

function safeRead(p){ try { return fs.readFileSync(p,"utf8"); } catch { return null; } }

const server = safeRead("./server.ts");
const validate = safeRead("./validate.ts") || safeRead("./src/validate.ts");

console.log("=== server.ts: middleware around POST /api/tasks ===");
if (server) {
  const idx = server.indexOf('app.post("/api/tasks"');
  const start = Math.max(0, idx - 300);
  const end = Math.min(server.length, idx + 400);
  console.log(server.slice(start, end));
} else {
  console.log("server.ts not found");
}

console.log("\n=== validate.ts: contents (first 400 lines) ===");
if (validate) {
  console.log(validate.slice(0, 12000));  // print plenty; we’ll scan for allowed fields
} else {
  console.log("validate.ts not found");
}
