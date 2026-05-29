import sqlite3

def migrate():
    conn = sqlite3.connect("trading_platform.db")
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE users ADD COLUMN custom_user_id TEXT")
        print("Added custom_user_id column")
    except sqlite3.OperationalError as e:
        print("custom_user_id column may already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
