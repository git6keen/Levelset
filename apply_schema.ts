import fs from "fs";
import Database from "better-sqlite3";

const DB_PATH = "./app.db";
const SCHEMA_PATH = "./schema.sql";

const sql = fs.readFileSync(SCHEMA_PATH, "utf8");
const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode=WAL;");
db.exec(sql);
console.log("Schema applied to", DB_PATH);
