import database
import random
from datetime import datetime, timedelta

def seed_data():
    database.init_db()
    conn = database.get_db()
    c = conn.cursor()

    users = [
        ("alice", "password123"),
        ("bob", "tradingexpert"),
        ("charlie", "investor"),
        ("diana", "cryptoqueen")
    ]

    symbols = ["AAPL", "TSLA", "BTC/USD", "ETH/USD", "AMZN", "MSFT"]
    
    print("Seeding users...")
    user_ids = []
    for username, password in users:
        try:
            c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                      (username, database.hash_password(password)))
            user_ids.append(c.lastrowid)
            print(f"Created user: {username} (Password: {password})")
        except database.sqlite3.IntegrityError:
            # User already exists, get their ID
            c.execute("SELECT id FROM users WHERE username = ?", (username,))
            user_ids.append(c.fetchone()['id'])
            print(f"User {username} already exists.")

    print("Seeding trades for users...")
    
    for uid in user_ids:
        # Check if user already has trades to prevent duplication on multiple runs
        c.execute("SELECT COUNT(*) as count FROM trades WHERE user_id = ?", (uid,))
        if c.fetchone()['count'] > 0:
            continue
            
        # Generate 5-15 random trades per user
        num_trades = random.randint(5, 15)
        for _ in range(num_trades):
            symbol = random.choice(symbols)
            trade_type = random.choice(["BUY", "SELL"])
            quantity = round(random.uniform(1.0, 100.0), 2)
            
            # Random date within the last 60 days
            days_ago = random.randint(1, 60)
            entry_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
            
            entry_price = round(random.uniform(50.0, 500.0), 2)
            
            # 80% chance the trade is closed
            if random.random() < 0.8:
                status = "CLOSED"
                exit_date = (datetime.now() - timedelta(days=max(0, days_ago - random.randint(1, 10)))).strftime('%Y-%m-%d')
                
                # Randomize profit/loss
                price_change_pct = random.uniform(-0.15, 0.25) # Slightly biased to profit
                if trade_type == "BUY":
                    exit_price = round(entry_price * (1 + price_change_pct), 2)
                    pnl = round((exit_price - entry_price) * quantity, 2)
                else:
                    exit_price = round(entry_price * (1 - price_change_pct), 2)
                    pnl = round((entry_price - exit_price) * quantity, 2)
            else:
                status = "OPEN"
                exit_date = None
                exit_price = None
                pnl = 0.0

            c.execute('''
                INSERT INTO trades (user_id, symbol, trade_type, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (uid, symbol, trade_type, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl))

    conn.commit()
    conn.close()
    print("\nDatabase seeded successfully!")

if __name__ == "__main__":
    seed_data()
