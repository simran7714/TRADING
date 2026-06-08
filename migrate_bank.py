import sqlite3

DB_NAME = "trading_platform.db"

def migrate():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Add bank_name column
    try:
        c.execute("ALTER TABLE users ADD COLUMN bank_name TEXT")
        print("Successfully added bank_name column to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column 'bank_name' already exists.")
        else:
            print(f"Error during bank_name migration: {e}")

    # Add bank_account_no column
    try:
        c.execute("ALTER TABLE users ADD COLUMN bank_account_no TEXT")
        print("Successfully added bank_account_no column to users table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column 'bank_account_no' already exists.")
        else:
            print(f"Error during bank_account_no migration: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
