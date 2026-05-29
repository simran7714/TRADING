import sqlite3
from datetime import datetime

def migrate():
    conn = sqlite3.connect("trading_platform.db")
    c = conn.cursor()
    try:
        c.execute("ALTER TABLE users ADD COLUMN phone_number TEXT")
        print("Added phone_number column")
    except sqlite3.OperationalError as e:
        print("phone_number column may already exist:", e)

    try:
        # Default existing users to current time
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        c.execute(f"ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT '{current_time}'")
        print("Added created_at column")
    except sqlite3.OperationalError as e:
        print("created_at column may already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
