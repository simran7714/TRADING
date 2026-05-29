import sqlite3

def migrate():
    conn = sqlite3.connect("trading_platform.db")
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE users ADD COLUMN broker_name TEXT")
        print("Added broker_name column")
    except sqlite3.OperationalError as e:
        print("broker_name column may already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
