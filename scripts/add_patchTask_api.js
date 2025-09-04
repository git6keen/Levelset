const fs = require("fs");
const p = "./api.ts";
let s = fs.readFileSync(p, "utf8");

if (!/export async function patchTask\(/.test(s)) {
  s += `

export async function patchTask(id: number, input: Partial<{title:string; description:string; priority:number; xp:number; coins:number}>): Promise<void> {
  const r = await fetch(\`\${BASE}/api/tasks/\${id}\`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await r.text());
}
`;
  fs.writeFileSync(p, s, "utf8");
  console.log("? api.ts: added patchTask(id, { description })");
} else {
  console.log("? api.ts already has patchTask");
}
