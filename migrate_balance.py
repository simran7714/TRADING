import sqlite3

def migrate():
    conn = sqlite3.connect("trading_platform.db")
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE users ADD COLUMN balance REAL DEFAULT 10000.0")
        print("Added balance column")
    except sqlite3.OperationalError as e:
        print("balance column may already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
