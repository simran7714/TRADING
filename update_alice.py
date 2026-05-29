import sqlite3

def update_alice():
    conn = sqlite3.connect('trading_platform.db')
    c = conn.cursor()
    c.execute('''
        UPDATE users SET email = 'alice@trade.ai', phone_number = '555-0101', custom_user_id = 'TRADER-ALICE'
        WHERE username = 'alice'
    ''')
    conn.commit()
    conn.close()
    print("Updated alice.")

if __name__ == '__main__':
    update_alice()
