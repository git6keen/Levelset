import sqlite3, pathlib

sql = pathlib.Path("schema.sql").read_text(encoding="utf-8")
conn = sqlite3.connect("app.db")
conn.executescript(sql)
conn.commit()
conn.close()
print("DB reset from schema.sql")
