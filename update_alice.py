import sqlite3

def update_alice():
    conn = sqlite3.connect('trading_platform.db')
    c = conn.cursor()
    c.execute('''
        UPDATE users SET email = 'alice@trade.ai', phone_number = '+91 98765 43210', custom_user_id = 'TRADER-ALICE', location = 'Mumbai, India'
        WHERE username = 'alice'
    ''')
    conn.commit()
    conn.close()
    print("Updated alice.")

if __name__ == '__main__':
    update_alice()
