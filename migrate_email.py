import sqlite3

DB_NAME = "trading_platform.db"

def migrate():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    try:
        c.execute("ALTER TABLE users ADD COLUMN email TEXT")
        print("Successfully added email column to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column 'email' already exists.")
        else:
            print(f"Error during migration: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
