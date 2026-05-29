import sqlite3

def migrate():
    conn = sqlite3.connect("trading_platform.db")
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE users ADD COLUMN location TEXT")
        print("Added location column successfully.")
    except sqlite3.OperationalError as e:
        print("location column may already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
