from flask import Flask, request, jsonify, session, send_from_directory
import database
import os
import random
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = 'super_secret_key_for_development'

def ensure_user_profile_populated(user_id, username, custom_user_id, phone_number, email, broker_name, location):
    updated = False
    new_custom_user_id = custom_user_id
    new_phone_number = phone_number
    new_email = email
    new_broker_name = broker_name
    new_location = location

    if not custom_user_id:
        new_custom_user_id = f"TL-{user_id:04d}"
        updated = True
    if not phone_number:
        country_codes = ["1", "44", "91", "49", "81", "33", "61", "86"]
        cc = country_codes[user_id % len(country_codes)]
        new_phone_number = f"+{cc}{555000000 + user_id}"
        updated = True
    if not email:
        new_email = f"{username.lower()}@tradelens.com"
        updated = True
    if not broker_name:
        brokers = ["Binance", "Interactive Brokers", "TradeStation", "OANDA"]
        new_broker_name = brokers[user_id % len(brokers)]
        updated = True
    if not location:
        locations = ["New York, USA", "London, UK", "Mumbai, India", "Berlin, Germany", "Tokyo, Japan", "Paris, France", "Sydney, Australia", "Shanghai, China"]
        new_location = locations[user_id % len(locations)]
        updated = True

    if updated:
        conn = database.get_db()
        c = conn.cursor()
        c.execute('''
            UPDATE users 
            SET custom_user_id = ?, phone_number = ?, email = ?, broker_name = ?, location = ?
            WHERE id = ?
        ''', (new_custom_user_id, new_phone_number, new_email, new_broker_name, new_location, user_id))
        conn.commit()
        conn.close()
        
    return {
        "custom_user_id": new_custom_user_id,
        "phone_number": new_phone_number,
        "email": new_email,
        "broker_name": new_broker_name,
        "location": new_location
    }

def seed_trades_for_user(c, user_id):
    symbols = ["AAPL", "TSLA", "BTC/USD", "ETH/USD", "AMZN", "MSFT"]
    num_trades = random.randint(5, 15)
    for _ in range(num_trades):
        symbol = random.choice(symbols)
        trade_type = random.choice(["BUY", "SELL"])
        quantity = round(random.uniform(1.0, 100.0), 2)
        
        # Random date within the last 60 days
        days_ago = random.randint(1, 60)
        entry_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        
        entry_price = round(random.uniform(50.0, 500.0), 2)
        
        # 80% chance the trade is closed
        if random.random() < 0.8:
            status = "CLOSED"
            exit_date = (datetime.now() - timedelta(days=max(0, days_ago - random.randint(1, 10)))).strftime('%Y-%m-%d %H:%M:%S')
            
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
        ''', (user_id, symbol, trade_type, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl))

def calculate_risk_analysis(trades):
    if not trades:
        return {"score": 50, "level": "MODERATE", "label": "Moderate Risk", "color": "#ffeb3b", "max_consecutive_losses": 0, "open_exposure": 0}

    closed_trades = [t for t in trades if t.get('status') == 'CLOSED']
    open_trades = [t for t in trades if t.get('status') == 'OPEN']

    # 1. Win Rate
    win_trades = [t for t in closed_trades if (t.get('pnl') or 0) > 0]
    total_closed = len(closed_trades)
    win_rate = (len(win_trades) / total_closed * 100) if total_closed > 0 else 50.0

    # 2. Avg Win vs Avg Loss
    losing_trades = [t for t in closed_trades if (t.get('pnl') or 0) < 0]
    avg_win = sum(t.get('pnl') or 0 for t in win_trades) / len(win_trades) if win_trades else 0
    avg_loss = abs(sum(t.get('pnl') or 0 for t in losing_trades) / len(losing_trades)) if losing_trades else 0

    score = 50.0 # Base score

    # Adjust based on win rate
    if win_rate >= 60:
        score -= 15
    elif win_rate < 40:
        score += 20

    # Adjust based on win/loss size ratio
    if avg_loss > 0 and avg_win > 0:
        ratio = avg_loss / avg_win
        if ratio > 1.5:
            score += 15
        elif ratio < 0.8:
            score -= 10
    elif len(losing_trades) > 0 and len(win_trades) == 0:
        score += 25

    # Adjust based on consecutive losses
    consecutive_losses = 0
    max_consecutive_losses = 0
    sorted_trades = sorted(closed_trades, key=lambda x: x.get('entry_date') or '')
    for t in sorted_trades:
        pnl = t.get('pnl') or 0
        if pnl < 0:
            consecutive_losses += 1
            if consecutive_losses > max_consecutive_losses:
                max_consecutive_losses = consecutive_losses
        else:
            consecutive_losses = 0

    if max_consecutive_losses >= 6:
        score += 25
    elif max_consecutive_losses >= 4:
        score += 15

    # Adjust based on open trades exposure
    if len(open_trades) >= 5:
        score += 15
    elif len(open_trades) >= 3:
        score += 8

    score = max(0.0, min(100.0, score))

    if score <= 30:
        level = "LOW"
        label = "Low Risk Profile"
        color = "#00e676"
    elif score <= 65:
        level = "MODERATE"
        label = "Moderate Risk Profile"
        color = "#ffeb3b"
    elif score <= 85:
        level = "HIGH"
        label = "High Risk Profile"
        color = "#ff9100"
    else:
        level = "CRITICAL"
        label = "Critical Risk Profile"
        color = "#ff1744"

    return {
        "score": int(score),
        "level": level,
        "label": label,
        "color": color,
        "max_consecutive_losses": max_consecutive_losses,
        "open_exposure": len(open_trades)
    }

def calculate_buy_sell_stats(trades):
    if not trades:
        return {
            "buy": {"count": 0, "win_rate": 0.0, "pnl": 0.0},
            "sell": {"count": 0, "win_rate": 0.0, "pnl": 0.0}
        }
    closed_trades = [t for t in trades if t.get('status') == 'CLOSED']
    buy_trades = [t for t in closed_trades if t.get('trade_type') == 'BUY']
    sell_trades = [t for t in closed_trades if t.get('trade_type') == 'SELL']
    
    buy_wins = sum(1 for t in buy_trades if (t.get('pnl') or 0) > 0)
    sell_wins = sum(1 for t in sell_trades if (t.get('pnl') or 0) > 0)
    
    buy_pnl = sum(t.get('pnl') or 0 for t in buy_trades)
    sell_pnl = sum(t.get('pnl') or 0 for t in sell_trades)
    
    buy_count = len(buy_trades)
    sell_count = len(sell_trades)
    
    buy_win_rate = (buy_wins / buy_count * 100) if buy_count > 0 else 0.0
    sell_win_rate = (sell_wins / sell_count * 100) if sell_count > 0 else 0.0
    
    return {
        "buy": {
            "count": buy_count,
            "win_rate": round(buy_win_rate, 1),
            "pnl": round(buy_pnl, 2)
        },
        "sell": {
            "count": sell_count,
            "win_rate": round(sell_win_rate, 1),
            "pnl": round(sell_pnl, 2)
        }
    }

def detect_frauds(trades, balance):
    flags = []
    
    if not trades:
        return {"status": "SECURE", "score": 0, "flags": [], "label": "No anomalies detected", "color": "#00e676", "total_flags": 0}

    closed_trades = [t for t in trades if t.get('status') == 'CLOSED']

    # Rule 1: High-Frequency Scalping Trading
    for t in closed_trades:
        entry_str = t.get('entry_date') or ''
        exit_str = t.get('exit_date') or ''
        if entry_str and exit_str:
            try:
                fmt = "%Y-%m-%d %H:%M:%S"
                entry_dt = datetime.strptime(entry_str, fmt) if len(entry_str) > 16 else datetime.strptime(entry_str, "%Y-%m-%d %H:%M")
                exit_dt = datetime.strptime(exit_str, fmt) if len(exit_str) > 16 else datetime.strptime(exit_str, "%Y-%m-%d %H:%M")
                diff = (exit_dt - entry_dt).total_seconds()
                if 0 <= diff <= 5:
                    flags.append({
                        "type": "HFT_SPAM",
                        "severity": "MEDIUM",
                        "message": f"HFT Scalping flagged: Trade #{t['id']} ({t['symbol']}) closed in {int(diff)}s."
                    })
            except Exception:
                pass

    # Rule 2: Wash Trading (opposite positions opened within 60s)
    sorted_trades = sorted(trades, key=lambda x: x.get('entry_date') or '')
    for i in range(len(sorted_trades) - 1):
        t1 = sorted_trades[i]
        t2 = sorted_trades[i+1]
        if t1['symbol'] == t2['symbol'] and t1['trade_type'] != t2['trade_type']:
            try:
                fmt = "%Y-%m-%d %H:%M:%S"
                dt1 = datetime.strptime(t1['entry_date'], fmt) if len(t1['entry_date']) > 16 else datetime.strptime(t1['entry_date'], "%Y-%m-%d %H:%M")
                dt2 = datetime.strptime(t2['entry_date'], fmt) if len(t2['entry_date']) > 16 else datetime.strptime(t2['entry_date'], "%Y-%m-%d %H:%M")
                diff = abs((dt2 - dt1).total_seconds())
                if diff <= 60:
                    flags.append({
                        "type": "WASH_TRADE",
                        "severity": "HIGH",
                        "message": f"Wash Trading: Opposite {t1['symbol']} positions opened within {int(diff)}s."
                    })
            except Exception:
                pass

    # Rule 3: Anomalous Sizing
    quantities = [float(t.get('quantity') or 0) for t in trades]
    if len(quantities) >= 5:
        quantities.sort()
        median_qty = quantities[len(quantities) // 2]
        for t in trades:
            qty = float(t.get('quantity') or 0)
            if median_qty > 0 and qty > 10 * median_qty:
                flags.append({
                    "type": "SIZE_ANOMALY",
                    "severity": "MEDIUM",
                    "message": f"Anomalous sizing: Trade #{t['id']} size ({qty}) is >10x median."
                })

    # Rule 4: Balance Arbitrage Check
    if balance and balance > 10000000:
        flags.append({
            "type": "BALANCE_ABUSE",
            "severity": "HIGH",
            "message": "Unrealistic Account Balance detected (possible arbitrage/database hack)."
        })

    high_count = sum(1 for f in flags if f['severity'] == 'HIGH')
    med_count = sum(1 for f in flags if f['severity'] == 'MEDIUM')
    
    if high_count > 0:
        status = "SUSPICIOUS"
        score = min(100, 30 + high_count * 25 + med_count * 10)
        color = "#ff1744"
        label = "CRITICAL WARNINGS"
    elif med_count > 0:
        status = "WARNING"
        score = min(100, 15 + med_count * 15)
        color = "#ff9100"
        label = "Anomaly Warnings Flagged"
    else:
        status = "SECURE"
        score = 0
        color = "#00e676"
        label = "Security Verified"

    return {
        "status": status,
        "score": score,
        "flags": flags[:3],
        "label": label,
        "color": color,
        "total_flags": len(flags)
    }

# Initialize database
database.init_db()

def generate_smart_insights(trades):
    if not trades:
        return ["Not enough data for AI insights yet. Start logging your trades!"]

    closed_trades = [t for t in trades if t.get('status') == 'CLOSED']
    if len(closed_trades) == 0:
        return ["No closed trades yet. Close some trades to see AI analysis."]

    insights = []
    
    # 1. Best/Worst Symbol Analysis
    symbol_stats = {}
    for t in closed_trades:
        sym = t['symbol']
        if sym not in symbol_stats:
            symbol_stats[sym] = {'pnl': 0, 'wins': 0, 'total': 0}
        symbol_stats[sym]['total'] += 1
        pnl = t.get('pnl') or 0
        symbol_stats[sym]['pnl'] += pnl
        if pnl > 0:
            symbol_stats[sym]['wins'] += 1
            
    best_symbol = max(symbol_stats.items(), key=lambda x: x[1]['pnl'], default=(None, None))
    worst_symbol = min(symbol_stats.items(), key=lambda x: x[1]['pnl'], default=(None, None))

    if best_symbol[0] and best_symbol[1]['pnl'] > 0:
        win_rate = (best_symbol[1]['wins'] / best_symbol[1]['total']) * 100
        insights.append(f"🤖 **AI Analysis**: Your most profitable asset is {best_symbol[0]} with a net profit of ${best_symbol[1]['pnl']:.2f} and a {win_rate:.1f}% win rate. Consider scaling your setups for this asset.")
    
    if worst_symbol[0] and worst_symbol[1]['pnl'] < 0:
        insights.append(f"⚠️ **Risk Warning**: {worst_symbol[0]} is your worst performing asset (${abs(worst_symbol[1]['pnl']):.2f} net loss). Review your strategy for this symbol or avoid it.")

    # 2. Buy vs Sell Analysis
    buy_trades = [t for t in closed_trades if t['trade_type'] == 'BUY']
    sell_trades = [t for t in closed_trades if t['trade_type'] == 'SELL']
    
    buy_win_rate = (sum(1 for t in buy_trades if (t.get('pnl') or 0) > 0) / len(buy_trades)) * 100 if buy_trades else 0
    sell_win_rate = (sum(1 for t in sell_trades if (t.get('pnl') or 0) > 0) / len(sell_trades)) * 100 if sell_trades else 0
    
    if len(buy_trades) >= 2 and len(sell_trades) >= 2:
        if buy_win_rate > sell_win_rate + 15:
            insights.append(f"📈 **Trend**: You perform significantly better going LONG ({buy_win_rate:.1f}% win rate) compared to SHORT ({sell_win_rate:.1f}%). Focus on your long strategies.")
        elif sell_win_rate > buy_win_rate + 15:
            insights.append(f"📉 **Trend**: You perform significantly better going SHORT ({sell_win_rate:.1f}% win rate) compared to LONG ({buy_win_rate:.1f}%). Your short-selling strategies are highly effective.")

    # 3. Basic holding time analysis
    try:
        def parse_date(d_str):
            if not d_str: return None
            d_str = d_str.split('.')[0]
            try:
                return datetime.fromisoformat(d_str)
            except:
                 if len(d_str) == 10:
                     return datetime.strptime(d_str, '%Y-%m-%d')
            return None
            
        winning_hold_times = []
        losing_hold_times = []
        for t in closed_trades:
            entry = parse_date(t.get('entry_date'))
            exit_date = parse_date(t.get('exit_date'))
            if entry and exit_date:
                days = (exit_date - entry).days
                if days >= 0:
                    if (t.get('pnl') or 0) > 0:
                        winning_hold_times.append(days)
                    else:
                        losing_hold_times.append(days)
                        
        if winning_hold_times and losing_hold_times:
            avg_win_days = sum(winning_hold_times) / len(winning_hold_times)
            avg_loss_days = sum(losing_hold_times) / len(losing_hold_times)
            
            if avg_loss_days > avg_win_days + 2:
                insights.append(f"⏱️ **Timing**: You hold losing trades ({avg_loss_days:.1f} days) much longer than winners ({avg_win_days:.1f} days). Remember to cut losses early!")
            elif avg_win_days > avg_loss_days + 2:
                insights.append(f"💎 **Diamond Hands**: Excellent discipline. You hold winners ({avg_win_days:.1f} days avg) longer than your losers ({avg_loss_days:.1f} days avg).")
    except Exception as e:
        pass

    if not insights:
         insights.append("📊 **AI Analysis**: Your performance is consistent, but more data is needed to uncover hidden patterns. Keep logging your trades!")
         
    return insights

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    phone_number = data.get('phone_number')
    email = data.get('email')
    broker_name = data.get('broker_name')
    balance = data.get('balance')
    
    if balance is not None:
        try:
            balance = float(balance)
        except ValueError:
            balance = 10000.0
    else:
        balance = 10000.0

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
    
    conn = database.get_db()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username, password_hash, phone_number, email, broker_name, balance) VALUES (?, ?, ?, ?, ?, ?)", 
                  (username, database.hash_password(password), phone_number, email, broker_name, balance))
        user_id = c.lastrowid
        seed_trades_for_user(c, user_id)
        conn.commit()
        return jsonify({"message": "User created successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = database.get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE username = ? AND password_hash = ?", 
              (username, database.hash_password(password)))
    user = c.fetchone()
    conn.close()
    
    if user:
        session['user_id'] = user['id']
        session['username'] = username
        return jsonify({"message": "Logged in successfully", "username": username}), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return jsonify({"message": "Logged out"}), 200

@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' in session:
        conn = database.get_db()
        c = conn.cursor()
        c.execute("SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location FROM users WHERE id = ?", (session['user_id'],))
        user = c.fetchone()
        conn.close()
        if user:
            user_data = dict(user)
            populated = ensure_user_profile_populated(
                user_data['id'], user_data['username'], 
                user_data['custom_user_id'], user_data['phone_number'], 
                user_data['email'], user_data['broker_name'], user_data['location']
            )
            user_data.update(populated)
            return jsonify(user_data), 200
    return jsonify({"error": "Not authenticated"}), 401

@app.route('/api/auth/profile', methods=['PUT'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    custom_user_id = data.get('custom_user_id')
    phone_number = data.get('phone_number')
    email = data.get('email')
    broker_name = data.get('broker_name')
    created_at = data.get('created_at')
    location = data.get('location')
    balance = data.get('balance')
    
    if balance is not None:
        try:
            balance = float(balance)
        except ValueError:
            balance = 10000.0
    else:
        balance = 10000.0
    
    conn = database.get_db()
    c = conn.cursor()
    try:
        c.execute('''
            UPDATE users 
            SET custom_user_id = ?, phone_number = ?, email = ?, broker_name = ?, created_at = ?, location = ?, balance = ?
            WHERE id = ?
        ''', (custom_user_id, phone_number, email, broker_name, created_at, location, balance, session['user_id']))
        conn.commit()
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/trades', methods=['GET', 'POST'])
def trades():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    user_id = session['user_id']
    conn = database.get_db()
    c = conn.cursor()

    if request.method == 'GET':
        c.execute("SELECT * FROM trades WHERE user_id = ? ORDER BY entry_date DESC", (user_id,))
        trades = [dict(row) for row in c.fetchall()]
        conn.close()
        return jsonify(trades), 200
        
    elif request.method == 'POST':
        data = request.json
        symbol = data.get('symbol', '').upper()
        trade_type = data.get('trade_type')
        entry_price = float(data.get('entry_price', 0))
        exit_price = data.get('exit_price')
        if exit_price:
             exit_price = float(exit_price)
        else:
             exit_price = None
             
        quantity = float(data.get('quantity', 0))
        entry_date = data.get('entry_date')
        exit_date = data.get('exit_date')
        status = data.get('status', 'OPEN')
        
        pnl = 0
        if status == 'CLOSED' and exit_price is not None:
            if trade_type == 'BUY':
                pnl = (exit_price - entry_price) * quantity
            else:
                pnl = (entry_price - exit_price) * quantity

        c.execute('''
            INSERT INTO trades (user_id, symbol, trade_type, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, symbol, trade_type, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl))
        conn.commit()
        conn.close()
        return jsonify({"message": "Trade added successfully"}), 201

@app.route('/api/trades/<int:trade_id>', methods=['PUT', 'DELETE'])
def trade_item(trade_id):
     if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
     
     conn = database.get_db()
     c = conn.cursor()
     
     # Verify ownership
     c.execute("SELECT id FROM trades WHERE id = ? AND user_id = ?", (trade_id, session['user_id']))
     trade = c.fetchone()
     if not trade:
         conn.close()
         return jsonify({"error": "Trade not found or unauthorized"}), 404

     if request.method == 'DELETE':
         c.execute("DELETE FROM trades WHERE id = ? AND user_id = ?", (trade_id, session['user_id']))
         conn.commit()
         conn.close()
         return jsonify({"message": "Trade deleted"}), 200
         
     elif request.method == 'PUT':
         data = request.json
         symbol = data.get('symbol', '').upper()
         trade_type = data.get('trade_type')
         entry_price = float(data.get('entry_price', 0))
         exit_price = data.get('exit_price')
         if exit_price is not None and exit_price != '':
             exit_price = float(exit_price)
         else:
             exit_price = None
             
         quantity = float(data.get('quantity', 0))
         entry_date = data.get('entry_date')
         exit_date = data.get('exit_date')
         status = data.get('status', 'OPEN')
         
         pnl = 0
         if status == 'CLOSED' and exit_price is not None:
             if trade_type == 'BUY':
                 pnl = (exit_price - entry_price) * quantity
             else:
                 pnl = (entry_price - exit_price) * quantity

         c.execute('''
             UPDATE trades 
             SET symbol = ?, trade_type = ?, entry_price = ?, exit_price = ?, quantity = ?, entry_date = ?, exit_date = ?, status = ?, pnl = ?
             WHERE id = ? AND user_id = ?
         ''', (symbol, trade_type, entry_price, exit_price, quantity, entry_date, exit_date, status, pnl, trade_id, session['user_id']))
         conn.commit()
         conn.close()
         return jsonify({"message": "Trade updated successfully"}), 200

@app.route('/api/analytics', methods=['GET'])
def analytics():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    user_id = session['user_id']
    conn = database.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM trades WHERE user_id = ?", (user_id,))
    trades = [dict(row) for row in c.fetchall()]
    c.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    user_row = c.fetchone()
    balance = user_row['balance'] if user_row else 10000.0
    conn.close()
    
    closed_trades = [t for t in trades if t['status'] == 'CLOSED']
    total_pnl = sum((t['pnl'] or 0) for t in closed_trades)
    win_trades = sum(1 for t in closed_trades if (t['pnl'] or 0) > 0)
    total_closed = len(closed_trades)
    win_rate = (win_trades / total_closed * 100) if total_closed > 0 else 0
    
    # AI insights
    insights = generate_smart_insights(trades)
    
    # Growth data (Mocked cumulative PnL over time for chart)
    # Simple sort by exit_date
    trades_with_exit = [t for t in closed_trades if t['exit_date']]
    trades_with_exit.sort(key=lambda x: x['exit_date'])
    
    growth_data = []
    current_pnl = 0
    for t in trades_with_exit:
        current_pnl += (t['pnl'] or 0)
        growth_data.append({"date": t['exit_date'].split('T')[0], "pnl": current_pnl})

    return jsonify({
        "total_pnl": total_pnl,
        "win_rate": win_rate,
        "total_closed": total_closed,
        "insights": insights[:3],
        "growth_data": growth_data,
        "risk": calculate_risk_analysis(trades),
        "fraud": detect_frauds(trades, balance),
        "buy_sell_stats": calculate_buy_sell_stats(trades)
    }), 200

@app.route('/api/autocomplete_trader', methods=['GET'])
def autocomplete_trader():
    username = request.args.get('username', '').strip()
    if not username:
        return jsonify([]), 200

    conn = database.get_db()
    c = conn.cursor()
    c.execute('''
        SELECT username, phone_number, email, custom_user_id 
        FROM users 
        WHERE username LIKE ? COLLATE NOCASE 
        LIMIT 5
    ''', (f"%{username}%",))
    results = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(results), 200

@app.route('/api/search_trader', methods=['POST'])
def search_trader():
    data = request.json
    username = data.get('username', '').strip()
    trader_id = data.get('trader_id', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    
    if not any([username, trader_id, phone, email]):
        return jsonify({"error": "At least one search field must be filled"}), 400

    conn = database.get_db()
    c = conn.cursor()
    
    query_parts = []
    params = []
    if username:
        query_parts.append("username = ? COLLATE NOCASE")
        params.append(username)
    if trader_id:
        query_parts.append("custom_user_id = ? COLLATE NOCASE")
        params.append(trader_id)
    if phone:
        query_parts.append("phone_number = ?")
        params.append(phone)
    if email:
        query_parts.append("email = ? COLLATE NOCASE")
        params.append(email)
        
    where_clause = " OR ".join(query_parts)
    
    c.execute(f'''
        SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location 
        FROM users 
        WHERE {where_clause}
    ''', tuple(params))
    
    user = c.fetchone()
    if not user:
        # Create user on-the-fly if they don't exist
        new_username = username if username else (f"trader_{trader_id}" if trader_id else f"user_{random.randint(1000, 9999)}")
        new_trader_id = trader_id if trader_id else f"TL-{random.randint(1000, 9999)}"
        new_email = email if email else f"{new_username.lower()}@tradelens.com"
        new_phone = phone if phone else None
        
        try:
            c.execute('''
                INSERT INTO users (username, password_hash, custom_user_id, phone_number, email)
                VALUES (?, ?, ?, ?, ?)
            ''', (new_username, database.hash_password("password123"), new_trader_id, new_phone, new_email))
            new_uid = c.lastrowid
            seed_trades_for_user(c, new_uid)
            conn.commit()
            
            c.execute("SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location FROM users WHERE id = ?", (new_uid,))
            user = c.fetchone()
        except database.sqlite3.IntegrityError:
            c.execute("SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location FROM users WHERE username = ? COLLATE NOCASE OR custom_user_id = ? COLLATE NOCASE", (new_username, new_trader_id))
            user = c.fetchone()
            
        if not user:
            conn.close()
            return jsonify({"error": "Trader not found"}), 404
        
    user_data = dict(user)
    user_id = user_data['id']
    session['user_id'] = user_id
    
    # Ensure Broker, Phone, and Email are never empty
    populated = ensure_user_profile_populated(
        user_data['id'], user_data['username'], 
        user_data['custom_user_id'], user_data['phone_number'], 
        user_data['email'], user_data['broker_name'], user_data['location']
    )
    user_data.update(populated)
    
    # Fetch trades
    c.execute("SELECT * FROM trades WHERE user_id = ? ORDER BY entry_date DESC", (user_id,))
    trades = [dict(row) for row in c.fetchall()]
    conn.close()
    
    # Compute analytics
    total_pnl = sum((t['pnl'] or 0) for t in trades if t['status'] == 'CLOSED')
    win_trades = sum(1 for t in trades if t['status'] == 'CLOSED' and (t['pnl'] or 0) > 0)
    total_closed = sum(1 for t in trades if t['status'] == 'CLOSED')
    win_rate = (win_trades / total_closed * 100) if total_closed > 0 else 0
    
    # AI insights
    insights = generate_smart_insights(trades)
    
    trades_with_exit = [t for t in trades if t['exit_date']]
    trades_with_exit.sort(key=lambda x: x['exit_date'])
    
    growth_data = []
    current_pnl = 0
    for t in trades_with_exit:
        current_pnl += (t['pnl'] or 0)
        growth_data.append({"date": t['exit_date'].split('T')[0], "pnl": current_pnl})

    analytics = {
        "total_pnl": total_pnl,
        "win_rate": win_rate,
        "total_closed": total_closed,
        "insights": insights[:3],
        "growth_data": growth_data,
        "risk": calculate_risk_analysis(trades),
        "buy_sell_stats": calculate_buy_sell_stats(trades)
    }

    return jsonify({
        "profile": user_data,
        "trades": trades,
        "analytics": analytics
    }), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    message = data.get('message', '').strip().lower()
    
    if not message:
        return jsonify({"reply": "I couldn't hear you. Please type a message!"}), 400

    user_id = session['user_id']
    conn = database.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    
    c.execute("SELECT * FROM trades WHERE user_id = ?", (user_id,))
    trades = [dict(row) for row in c.fetchall()]
    conn.close()

    if not user:
        return jsonify({"reply": "Trader profile not found."}), 404

    closed_trades = [t for t in trades if t['status'] == 'CLOSED']
    total_pnl = sum((t['pnl'] or 0) for t in closed_trades)
    win_trades = [t for t in closed_trades if (t['pnl'] or 0) > 0]
    total_closed = len(closed_trades)
    win_rate = (len(win_trades) / total_closed * 100) if total_closed > 0 else 0
    current_balance = (user['balance'] or 0) + total_pnl

    risk = calculate_risk_analysis(trades)
    
    import re
    msg = message.lower()
    
    if any(x in msg for x in ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"]):
        reply = f"Hello {user['username']}! 👋 I am your TradeLens AI Copilot. How can I assist you with your trading stats, risk profiles, or market setups today?"
    elif any(x in msg for x in ["who are you", "what is your name", "your name"]):
        reply = "I am the TradeLens AI Copilot, a customized conversational intelligence designed to analyze your performance metrics and guide your trading strategy."
    elif re.match(r'^[\d\+\-\*\/\s\(\)]+$', msg) and any(op in msg for op in ['+', '-', '*', '/']):
        try:
            res = eval(msg, {"__builtins__": None}, {})
            reply = f"The calculation result is: **{res}**"
        except Exception:
            reply = "I detected a math expression but couldn't parse it. Please check your syntax!"
    elif "win rate" in msg or "winrate" in msg or "winning percentage" in msg:
        reply = f"Your current win rate is **{win_rate:.1f}%** based on **{total_closed}** closed trades. You have {len(win_trades)} wins and {total_closed - len(win_trades)} losses."
    elif "risk" in msg or "exposure" in msg or "drawdown" in msg:
        reply = f"Your Risk Score is **{risk['score']}/100** ({risk['level']} RISK). Max consecutive losing trades in a row: {risk['max_consecutive_losses']}. Open exposure: {risk['open_exposure']} trades."
    elif "balance" in msg or "equity" in msg or "capital" in msg:
        reply = f"Your account balance is **${current_balance:,.2f}** (Initial funding: ${user['balance'] or 10000.0:,.2f}, Total PnL: ${total_pnl:+,.2f})."
    elif "profit" in msg or "pnl" in msg or "loss" in msg or "how much" in msg:
        reply = f"Your total cumulative PnL is **${total_pnl:+,.2f}**. You have logged {total_closed} closed trades and {len(trades) - total_closed} open positions."
    elif "best symbol" in msg or "best asset" in msg or "profitable asset" in msg:
        if closed_trades:
            symbol_stats = {}
            for t in closed_trades:
                sym = t['symbol']
                symbol_stats[sym] = symbol_stats.get(sym, 0) + (t['pnl'] or 0)
            best_sym = max(symbol_stats.items(), key=lambda x: x[1], default=(None, 0))
            if best_sym[0] and best_sym[1] > 0:
                reply = f"Your most profitable asset is **{best_sym[0]}** with a net profit of **${best_sym[1]:,.2f}** across your history."
            else:
                reply = "You don't have a net profitable asset yet. Focus on high-probability setups!"
        else:
            reply = "I need trade history data to compute your best asset. Log some trades first!"
    elif "smc" in msg or "smart money" in msg:
        reply = "Smart Money Concepts (SMC) focuses on tracking bank/institutional footprints. Key setups involve identifying **Order Blocks (OB)**, **Liquidity Pools** (Buy-side/Sell-side), **Fair Value Gaps (FVG)**, and trading in the direction of the **Change of Character (CHOCH)**."
    elif "ict" in msg or "fvg" in msg or "fair value gap" in msg:
        reply = "A Fair Value Gap (FVG) occurs on high-momentum moves leaving an imbalance. The market typically returns to fill this gap before continuing. In ICT, we look for FVGs formed after a liquidity sweep and market structure shift."
    elif "order block" in msg or "ob" in msg:
        reply = "An Order Block (OB) represents institutional supply or demand. Look for mitigation entries when the price retraces to the last down-candle before an upward expansion (Bullish OB) or vice-versa."
    else:
        if msg.endswith("?") or any(w in msg for w in ["what", "why", "how", "who", "where", "when", "can", "should", "is"]):
            words = [w for w in re.split(r'\W+', msg) if w not in ["what", "is", "a", "an", "the", "why", "does", "how", "to", "do", "you", "about", "your", "my", "of", "in", "on", "can", "should", "tell", "me", "define", "explain", "meaning"]]
            topic = " ".join(words).strip().title()
            if not topic:
                topic = "This Subject"
                
            advices = [
                "Under standard market microstructure, this is highly linked to institutional supply and demand dynamics.",
                "In high-performance trading setups, traders look for structural alignments (confluences) to manage this risk.",
                "Always combine this factor with your risk score and keep clear journals to evaluate its performance."
            ]
            reply = f"That is a great question! Regarding **{topic}**: {random.choice(advices)} For your active account under **{user['broker_name'] or 'Broker'}**, make sure to test it with a clean position size first."
        else:
            reply = f"I hear you! I am ready to assist. Ask me about *win rate*, *risk*, *profit*, or explain trading terms like *SMC*, *FVG*, or *Order Blocks*!"

    return jsonify({"reply": reply}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
