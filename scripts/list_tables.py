import sqlite3

c = sqlite3.connect("app.db")
for (name,) in c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
    print(name)
