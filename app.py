from flask import Flask, request, jsonify, session, send_from_directory
import database
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('FLASK_SECRET', 'tradelens_dev_secret')

def validate_phone_number(phone_number):
    if not phone_number:
        return True, ""
    cleaned = ''.join(c for c in phone_number if c.isdigit() or c == '+')
    if not cleaned.startswith('+'):
        return False, "Phone number must start with a country dial code (e.g. +91)."
        
    if cleaned.startswith('+91'):
        num = cleaned[3:]
        if len(num) != 10 or not num.isdigit() or num[0] not in '6789':
            return False, "Indian phone numbers must be exactly 10 digits and start with 6, 7, 8, or 9."
    elif cleaned.startswith('+1'):
        num = cleaned[2:]
        if len(num) != 10 or not num.isdigit():
            return False, "US/Canada phone numbers must be exactly 10 digits."
    elif cleaned.startswith('+44'):
        num = cleaned[3:]
        if len(num) != 10 or not num.isdigit():
            return False, "UK phone numbers must be exactly 10 digits."
    elif cleaned.startswith('+49'):
        num = cleaned[3:]
        if len(num) < 10 or len(num) > 11 or not num.isdigit():
            return False, "German phone numbers must be 10 or 11 digits."
    elif cleaned.startswith('+81'):
        num = cleaned[3:]
        if len(num) < 9 or len(num) > 10 or not num.isdigit():
            return False, "Japanese phone numbers must be 9 or 10 digits."
    elif cleaned.startswith('+61'):
        num = cleaned[3:]
        if len(num) != 9 or not num.isdigit():
            return False, "Australian phone numbers must be exactly 9 digits."
    elif cleaned.startswith('+86'):
        num = cleaned[3:]
        if len(num) != 11 or not num.isdigit() or num[0] != '1':
            return False, "Chinese phone numbers must be exactly 11 digits and start with 1."
    else:
        digits = ''.join(c for c in cleaned if c.isdigit())
        if len(digits) < 7 or len(digits) > 15:
            return False, "Phone number must be between 7 and 15 digits."
            
    return True, ""

def ensure_user_profile_populated(user_id, username, custom_user_id, phone_number, email, broker_name, location, bank_name=None, bank_account_no=None):
    updated = False
    updates = {}

    if not custom_user_id:
        updates['custom_user_id'] = f"TL-{user_id:04d}"
        updated = True
    if not phone_number:
        country_codes = ["1","44","91","49","81","61","86"]
        cc = country_codes[user_id % len(country_codes)]
        updates['phone_number'] = f"+{cc} 5550000{user_id % 100:02d}"
        updated = True
    if not email:
        updates['email'] = f"{username.lower()}@tradelens.com"
        updated = True
    if not broker_name:
        brokers = ["Binance","Interactive Brokers","TradeStation","OANDA"]
        updates['broker_name'] = brokers[user_id % len(brokers)]
        updated = True
    if not location:
        locations = ["New York, USA","London, UK","Mumbai, India","Berlin, Germany","Tokyo, Japan","Sydney, Australia"]
        updates['location'] = locations[user_id % len(locations)]
        updated = True
    if not bank_name:
        loc = (updates.get('location', location) or '').lower()
        if 'india' in loc or 'mumbai' in loc: banks = ["HDFC Bank","SBI","ICICI Bank","Axis Bank"]
        elif 'usa' in loc or 'new york' in loc: banks = ["Chase Bank","Bank of America","Wells Fargo"]
        elif 'uk' in loc or 'london' in loc: banks = ["Barclays","HSBC","Lloyds Bank"]
        elif 'germany' in loc or 'berlin' in loc: banks = ["Deutsche Bank","Commerzbank","N26"]
        elif 'japan' in loc or 'tokyo' in loc: banks = ["MUFG Bank","Mizuho Bank"]
        elif 'australia' in loc or 'sydney' in loc: banks = ["Commonwealth Bank","Westpac","ANZ"]
        else: banks = ["Chase Bank","HDFC Bank","HSBC"]
        updates['bank_name'] = banks[user_id % len(banks)]
        updated = True
    if not bank_account_no:
        updates['bank_account_no'] = f"xxxx{1000 + user_id}"
        updated = True

    if updated:
        try:
            sb = database.get_supabase()
            sb.table('users').update(updates).eq('id', user_id).execute()
        except Exception:
            pass

    return {
        'custom_user_id': updates.get('custom_user_id', custom_user_id),
        'phone_number': updates.get('phone_number', phone_number),
        'email': updates.get('email', email),
        'broker_name': updates.get('broker_name', broker_name),
        'location': updates.get('location', location),
        'bank_name': updates.get('bank_name', bank_name),
        'bank_account_no': updates.get('bank_account_no', bank_account_no),
    }


def seed_trades_for_user(user_id):
    sb = database.get_supabase()
    symbols = ["AAPL","TSLA","BTC/USD","ETH/USD","AMZN","MSFT"]
    rows = []
    for _ in range(random.randint(5, 15)):
        symbol = random.choice(symbols)
        trade_type = random.choice(["BUY","SELL"])
        quantity = round(random.uniform(1.0, 100.0), 2)
        days_ago = random.randint(1, 60)
        entry_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        entry_price = round(random.uniform(50.0, 500.0), 2)
        if random.random() < 0.8:
            status = "CLOSED"
            exit_date = (datetime.now() - timedelta(days=max(0, days_ago - random.randint(1,10)))).strftime('%Y-%m-%d %H:%M:%S')
            pct = random.uniform(-0.15, 0.25)
            exit_price = round(entry_price * (1 + pct if trade_type == 'BUY' else 1 - pct), 2)
            pnl = round((exit_price - entry_price) * quantity if trade_type == 'BUY' else (entry_price - exit_price) * quantity, 2)
        else:
            status = "OPEN"; exit_date = None; exit_price = None; pnl = 0.0
        rows.append({'user_id': user_id, 'symbol': symbol, 'trade_type': trade_type,
                     'entry_price': entry_price, 'exit_price': exit_price, 'quantity': quantity,
                     'entry_date': entry_date, 'exit_date': exit_date, 'status': status, 'pnl': pnl})
    sb.table('trades').insert(rows).execute()


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

# Supabase: tables are created via SQL in the dashboard
# database.init_db() is a no-op

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
    return app.send_static_file('hero.html')

@app.route('/login')
def login_page():
    return app.send_static_file('index.html')

@app.route('/dashboard')
def dashboard_page():
    return app.send_static_file('index.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    phone_number = data.get('phone_number', '')
    email = data.get('email', '')
    broker_name = data.get('broker_name', '')
    balance = float(data.get('balance') or 10000.0)

    if phone_number:
        is_valid, err_msg = validate_phone_number(phone_number)
        if not is_valid:
            return jsonify({'error': err_msg}), 400
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    sb = database.get_supabase()
    # Check duplicate
    existing = sb.table('users').select('id').eq('username', username).execute()
    if existing.data:
        return jsonify({'error': 'Username already exists'}), 409
    try:
        res = sb.table('users').insert({
            'username': username,
            'password_hash': database.hash_password(password),
            'phone_number': phone_number or None,
            'email': email or None,
            'broker_name': broker_name or None,
            'balance': balance
        }).execute()
        new_user = res.data[0]
        seed_trades_for_user(new_user['id'])
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    sb = database.get_supabase()
    res = sb.table('users').select('id,username').eq('username', username).eq('password_hash', database.hash_password(password)).execute()
    if res.data:
        session['user_id'] = res.data[0]['id']
        session['username'] = username
        return jsonify({'message': 'Logged in successfully', 'username': username}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return jsonify({'message': 'Logged out'}), 200

@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    sb = database.get_supabase()
    res = sb.table('users').select('id,username,phone_number,email,created_at,balance,broker_name,custom_user_id,location,bank_name,bank_account_no').eq('id', session['user_id']).execute()
    if not res.data:
        return jsonify({'error': 'Not authenticated'}), 401
    user_data = res.data[0]
    populated = ensure_user_profile_populated(
        user_data['id'], user_data['username'],
        user_data.get('custom_user_id'), user_data.get('phone_number'),
        user_data.get('email'), user_data.get('broker_name'),
        user_data.get('location'), user_data.get('bank_name'), user_data.get('bank_account_no')
    )
    user_data.update(populated)
    return jsonify(user_data), 200

@app.route('/api/auth/profile', methods=['PUT'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    phone_number = data.get('phone_number')
    if phone_number:
        is_valid, err_msg = validate_phone_number(phone_number)
        if not is_valid:
            return jsonify({'error': err_msg}), 400
    balance = data.get('balance')
    try:
        balance = float(balance) if balance is not None else 10000.0
    except (ValueError, TypeError):
        balance = 10000.0
    sb = database.get_supabase()
    try:
        sb.table('users').update({
            'custom_user_id': data.get('custom_user_id'),
            'phone_number': phone_number,
            'email': data.get('email'),
            'broker_name': data.get('broker_name'),
            'location': data.get('location'),
            'balance': balance,
            'bank_name': data.get('bank_name'),
            'bank_account_no': data.get('bank_account_no'),
        }).eq('id', session['user_id']).execute()
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trades', methods=['GET', 'POST'])
def trades():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_id = session['user_id']
    sb = database.get_supabase()
    if request.method == 'GET':
        res = sb.table('trades').select('*').eq('user_id', user_id).order('entry_date', desc=True).execute()
        return jsonify(res.data), 200
    data = request.json
    symbol = data.get('symbol', '').upper()
    trade_type = data.get('trade_type')
    entry_price = float(data.get('entry_price', 0))
    exit_price = data.get('exit_price')
    exit_price = float(exit_price) if exit_price else None
    quantity = float(data.get('quantity', 0))
    status = data.get('status', 'OPEN')
    pnl = 0
    if status == 'CLOSED' and exit_price is not None:
        pnl = (exit_price - entry_price) * quantity if trade_type == 'BUY' else (entry_price - exit_price) * quantity
    sb.table('trades').insert({
        'user_id': user_id, 'symbol': symbol, 'trade_type': trade_type,
        'entry_price': entry_price, 'exit_price': exit_price, 'quantity': quantity,
        'entry_date': data.get('entry_date'), 'exit_date': data.get('exit_date'),
        'status': status, 'pnl': round(pnl, 2)
    }).execute()
    return jsonify({'message': 'Trade added successfully'}), 201

@app.route('/api/trades/<int:trade_id>', methods=['PUT', 'DELETE'])
def trade_item(trade_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    sb = database.get_supabase()
    check = sb.table('trades').select('id').eq('id', trade_id).eq('user_id', session['user_id']).execute()
    if not check.data:
        return jsonify({'error': 'Trade not found or unauthorized'}), 404
    if request.method == 'DELETE':
        sb.table('trades').delete().eq('id', trade_id).execute()
        return jsonify({'message': 'Trade deleted'}), 200
    data = request.json
    entry_price = float(data.get('entry_price', 0))
    exit_price = data.get('exit_price')
    exit_price = float(exit_price) if exit_price not in (None, '') else None
    quantity = float(data.get('quantity', 0))
    trade_type = data.get('trade_type')
    status = data.get('status', 'OPEN')
    pnl = 0
    if status == 'CLOSED' and exit_price is not None:
        pnl = (exit_price - entry_price) * quantity if trade_type == 'BUY' else (entry_price - exit_price) * quantity
    sb.table('trades').update({
        'symbol': data.get('symbol', '').upper(), 'trade_type': trade_type,
        'entry_price': entry_price, 'exit_price': exit_price, 'quantity': quantity,
        'entry_date': data.get('entry_date'), 'exit_date': data.get('exit_date'),
        'status': status, 'pnl': round(pnl, 2)
    }).eq('id', trade_id).execute()
    return jsonify({'message': 'Trade updated successfully'}), 200

@app.route('/api/analytics', methods=['GET'])
def analytics():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    sb = database.get_supabase()
    trades_res = sb.table('trades').select('*').eq('user_id', session['user_id']).execute()
    trades = trades_res.data
    user_res = sb.table('users').select('balance').eq('id', session['user_id']).execute()
    balance = user_res.data[0]['balance'] if user_res.data else 10000.0
    closed = [t for t in trades if t['status'] == 'CLOSED']
    total_pnl = sum((t['pnl'] or 0) for t in closed)
    win_trades = sum(1 for t in closed if (t['pnl'] or 0) > 0)
    total_closed = len(closed)
    win_rate = (win_trades / total_closed * 100) if total_closed > 0 else 0
    trades_with_exit = sorted([t for t in closed if t['exit_date']], key=lambda x: x['exit_date'])
    growth_data, cur = [], 0
    for t in trades_with_exit:
        cur += (t['pnl'] or 0)
        growth_data.append({'date': (t['exit_date'] or '')[:10], 'pnl': cur})
    return jsonify({
        'total_pnl': total_pnl, 'win_rate': win_rate, 'total_closed': total_closed,
        'insights': generate_smart_insights(trades)[:3], 'growth_data': growth_data,
        'risk': calculate_risk_analysis(trades), 'fraud': detect_frauds(trades, balance),
        'buy_sell_stats': calculate_buy_sell_stats(trades)
    }), 200

@app.route('/api/autocomplete_trader', methods=['GET'])
def autocomplete_trader():
    username = request.args.get('username', '').strip()
    if not username:
        return jsonify([]), 200
    sb = database.get_supabase()
    res = sb.table('users').select('username,phone_number,email,custom_user_id').ilike('username', f'%{username}%').limit(5).execute()
    return jsonify(res.data), 200

@app.route('/api/search_trader', methods=['POST'])
def search_trader():
    data = request.json
    username = data.get('username', '').strip()
    trader_id = data.get('trader_id', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    
    if not any([username, trader_id, phone, email]):
        return jsonify({"error": "At least one search field must be filled"}), 400

    sb = database.get_supabase()
    
    or_conds = []
    if username:
        or_conds.append(f"username.ilike.%{username}%")
    if trader_id:
        or_conds.append(f"custom_user_id.ilike.%{trader_id}%")
    if phone:
        or_conds.append(f"phone_number.eq.{phone}")
    if email:
        or_conds.append(f"email.ilike.%{email}%")
        
    query = sb.table('users').select('id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location, bank_name, bank_account_no')
    if or_conds:
        query = query.or_(','.join(or_conds))
        
    res = query.execute()
    
    if not res.data:
        # Create user on-the-fly if they don't exist
        new_username = username if username else (f"trader_{trader_id}" if trader_id else f"user_{random.randint(1000, 9999)}")
        new_trader_id = trader_id if trader_id else f"TL-{random.randint(1000, 9999)}"
        new_email = email if email else f"{new_username.lower()}@tradelens.com"
        new_phone = phone if phone else None
        
        try:
            insert_res = sb.table('users').insert({
                'username': new_username,
                'password_hash': database.hash_password("password123"),
                'custom_user_id': new_trader_id,
                'phone_number': new_phone,
                'email': new_email
            }).execute()
            
            user_data = insert_res.data[0]
            new_uid = user_data['id']
            seed_trades_for_user(new_uid)
            
        except Exception:
            fallback_res = sb.table('users').select('id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location, bank_name, bank_account_no').or_(f"username.eq.{new_username},custom_user_id.eq.{new_trader_id}").execute()
            if fallback_res.data:
                user_data = fallback_res.data[0]
            else:
                return jsonify({"error": "Trader not found"}), 404
    else:
        user_data = res.data[0]
        
    user_id = user_data['id']
    session['user_id'] = user_id
    
    # Ensure Broker, Phone, and Email are never empty
    populated = ensure_user_profile_populated(
        user_data['id'], user_data['username'], 
        user_data.get('custom_user_id'), user_data.get('phone_number'), 
        user_data.get('email'), user_data.get('broker_name'), user_data.get('location'),
        user_data.get('bank_name'), user_data.get('bank_account_no')
    )
    user_data.update(populated)
    
    # Fetch trades
    trades_res = sb.table('trades').select('*').eq('user_id', user_id).order('entry_date', desc=True).execute()
    trades = trades_res.data
    
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
    user = dict(user)

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
    elif any(x in msg for x in ["support", "helpline", "contact", "phone support", "customer care"]):
        loc = (user.get('location') or "").lower()
        if "india" in loc or "mumbai" in loc:
            reply = "Our Indian support helpline is **+91 1800 266 0199** (Toll-Free, 24/7)."
        elif "usa" in loc or "new york" in loc or "united states" in loc:
            reply = "Our US support helpline is **+1 800 555 0199** (Toll-Free, 24/7)."
        elif "uk" in loc or "london" in loc or "united kingdom" in loc:
            reply = "Our UK support helpline is **+44 808 196 0199** (Toll-Free, 24/7)."
        elif "germany" in loc or "berlin" in loc:
            reply = "Our German support helpline is **+49 800 180 0199** (Toll-Free, 24/7)."
        elif "japan" in loc or "tokyo" in loc:
            reply = "Our Japanese support helpline is **+81 120 939 199** (Toll-Free, 24/7)."
        elif "australia" in loc or "sydney" in loc:
            reply = "Our Australian support helpline is **+61 1800 861 199** (Toll-Free, 24/7)."
        elif "china" in loc or "shanghai" in loc:
            reply = "Our Chinese support helpline is **+86 400 820 0199** (Toll-Free, 24/7)."
        else:
            reply = "Our Global support helpline is **+1 800 555 0199** (Toll-Free, 24/7)."
    elif "bank" in msg:
        if user.get('bank_name') and user.get('bank_account_no'):
            reply = f"Your linked bank account is **{user['bank_name']}** (Account Number: **{user['bank_account_no']}**)."
        else:
            reply = "You do not have a bank account linked to TradeLens yet. You can link one in your Edit Profile modal!"
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
