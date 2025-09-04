const fs = require("fs");
const p = "./TasksPage.tsx";
let s = fs.readFileSync(p, "utf8");

// Import patchTask
s = s.replace(
  /from "\.\/api";/,
  `from "./api";
import { patchTask } from "./api";`
);

// After successful create, fetch list and PATCH description onto the newest matching row
s = s.replace(
  /await createTask\(payload\);\s*[\s\S]*?await load\(\);\s*[\s\S]*?setStatus\("Task created"\);/m,
  `await createTask(payload);

      // If a description was provided, ensure it's persisted by PATCHing the newest matching task
      const descToSave = (payload.description ?? "").toString();
      if (descToSave.trim().length > 0) {
        try {
          // get the latest tasks (default sort is created_at DESC on the server)
          const latest = await fetchTasks({});
          const candidate = (latest || []).find(r => r.title === payload.title && (!r.description || r.description.trim() === ""));
          const idAny = candidate ? ((candidate as any).task_id ?? (candidate as any).id) : null;
          if (idAny != null) {
            await patchTask(Number(idAny), { description: descToSave });
          }
        } catch {}
      }

      await load();
      setStatus("Task created");`
);

fs.writeFileSync(p, s, "utf8");
console.log("? TasksPage.tsx: after-create now PATCHes description to the new task");
