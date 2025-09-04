const fs = require("fs");
const p = "./TasksPage.tsx";
let s = fs.readFileSync(p, "utf8");

// 1) Ensure we pass description in the createTask call.
//    Replace any createTask({ ... }) inside onCreate with a known-good object literal.
s = s.replace(
  /async function onCreate[\s\S]*?\{([\s\S]*?)createTask\([\s\S]*?\)\s*;([\s\S]*?)\}/m,
  (m, before, after) => {
    const block =
`async function onCreate(e?: React.FormEvent) {
  e?.preventDefault();
  if (!title.trim()) { setStatus("Title is required"); return; }
  setSubmitting(true);
  setStatus("Saving…");
  try {
    const payload = {
      title: title.trim(),
      description: (typeof desc !== "undefined" && desc && desc.trim()) || null,
      priority: prioIn,
      xp: xpIn || 0,
      coins: coinsIn || 0
    };
    console.log("createTask payload (JSON) ->", JSON.stringify(payload));
    await createTask(payload);
    setTitle(""); setDesc(""); setPrioIn(3); setXpIn(10); setCoinsIn(0);
    await load();
    setStatus("Task created");
  } catch (e:any) {
    setStatus(e?.message || "Failed to create task");
  } finally {
    setSubmitting(false);
  }
}`;
    return block;
  }
);

// 2) Fix React missing key warning: give a robust key fallback.
s = s.replace(/<tr key=\{r\.task_id\}/g, `<tr key={(r.task_id ?? (r as any).id ?? (r.title + (r.created_at||"")))}`);

// 3) Show description cell robustly (simple hyphen fallback).
s = s.replace(/\{r\.description[^\}]*\}/g, `{(r.description && r.description.trim()) || "-"}`);

fs.writeFileSync(p, s, "utf8");
console.log("? TasksPage.tsx patched: sends description, logs JSON payload, fixes missing key warning.");
