const fs = require("fs");
const p = "./api.ts";
let s = fs.readFileSync(p,"utf8");

// Ensure we include X-Desc header mirrored from input.description
s = s.replace(
  /fetch\(BASE \+ "\/api\/tasks",\s*\{\s*method:\s*"POST",\s*headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\},/m,
  match => match.replace(
    /headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\}/,
    `headers: { "Content-Type": "application/json", "X-Desc": String((input as any).description ?? "") }`
  )
);

fs.writeFileSync(p,s,"utf8");
console.log("? api.ts now also sends X-Desc header with the description");
