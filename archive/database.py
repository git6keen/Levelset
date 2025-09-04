"""
Prototype 3 — database.py
Ensures SQLite schema version matches schema.sql.
CONTRACTS:
- ensure_schema_current() -> None
"""

import re
import sqlite3
from typing import Tuple
from errors import ERRORS

DB_PATH = "app.db"

def _get_db_version(cur) -> Tuple[str]:
    # Align to schema.sql: meta(key, value)
    cur.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)")
    cur.execute("SELECT value FROM meta WHERE key='schema_version'")
    row = cur.fetchone()
    if row is None:
        return ("0",)
    return row

def _get_sql_schema_version() -> str:
    """
    Try to read a version from schema.sql.
    Prefer a comment like: -- SCHEMA_VERSION=3
    Fallback: parse the INSERT that sets schema_version in the meta table.
    """
    with open("schema.sql", "r", encoding="utf-8") as f:
        text = f.read()

    # Preferred: explicit comment
    m = re.search(r"^\s*--\s*SCHEMA_VERSION\s*=\s*(\d+)\s*$", text, re.MULTILINE)
    if m:
        return m.group(1)

    # Fallback: parse INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version','N');
    m = re.search(
        r"INSERT\s+OR\s+REPLACE\s+INTO\s+meta\s*\(\s*key\s*,\s*value\s*\)"
        r"\s*VALUES\s*\(\s*'schema_version'\s*,\s*'(\d+)'\s*\)",
        text,
        re.IGNORECASE,
    )
    if m:
        return m.group(1)

    return "0"

def ensure_schema_current() -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        db_ver = _get_db_version(cur)[0]
        sql_ver = _get_sql_schema_version()
        if db_ver != sql_ver:
            # Lightweight migration marker (extend with real migrations later)
            cur.execute(
                "INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version', ?)",
                (sql_ver,),
            )
            conn.commit()
    finally:
        conn.close()
