import Database from "better-sqlite3";
const db = new Database("./app.db");

function show(name: string, sql: string){
  try {
    const rows = db.prepare(sql).all();
    console.log(`\n== ${name} == (${rows.length} rows)`);
    console.log(rows.slice(0,5));
  } catch (e) {
    console.error(`\n!! ${name} FAILED:`, (e as any).message);
  }
}

show("tasks_api", "SELECT id,title,priority,xp,coins,created_at FROM tasks_api ORDER BY id DESC LIMIT 5");
show("checklists_api", "SELECT id,name,category,created_at FROM checklists_api ORDER BY id DESC LIMIT 5");
show("checklist_items_api", "SELECT id,checklist_id,text,done,position FROM checklist_items_api ORDER BY id DESC LIMIT 5");
