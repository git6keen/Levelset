import sqlite3

conn = sqlite3.connect("app.db")
cur = conn.cursor()

print("=== Tables in app.db ===")
for (name,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
    print("-", name)

print("\n=== Example counts ===")
for (name,) in cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
    count = cur.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
    print(f"{name}: {count} rows")

conn.close()
