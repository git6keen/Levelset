import Database from "better-sqlite3";

const db = new Database("./app.db");
function cols(t: string) {
  const c = db.prepare(`PRAGMA table_info(${t})`).all() as Array<{cid:number;name:string;type:string;notnull:number;dflt_value:any;pk:number}>;
  console.log(`\n== ${t} ==`);
  for (const r of c) console.log(` - ${r.name} ${r.type} ${r.notnull ? "NOT NULL" : ""} DEFAULT ${r.dflt_value ?? "NULL"}`);
  const create = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t) as any;
  if (create?.sql) console.log("\nCREATE SQL:\n" + create.sql + "\n");
}

["tasks","checklists","checklist_items","activity_log"].forEach(cols);
