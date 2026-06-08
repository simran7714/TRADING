import re

with open('c:/TRADING/app.py', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

new_lines = []
for i, line in enumerate(lines):
    # 0-indexed line numbers
    if 108 <= i <= 194:
        continue
    if 218 <= i <= 254:
        continue
    if 773 <= i <= 926:
        continue
    new_lines.append(line)

content = '\n'.join(new_lines)

# Now fix search_trader and chat
# search_trader replacement
search_trader_old = """@app.route('/api/search_trader', methods=['POST'])
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
        SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location, bank_name, bank_account_no 
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
            
            c.execute("SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location, bank_name, bank_account_no FROM users WHERE id = ?", (new_uid,))
            user = c.fetchone()
        except database.sqlite3.IntegrityError:
            c.execute("SELECT id, username, phone_number, email, created_at, balance, broker_name, custom_user_id, location, bank_name, bank_account_no FROM users WHERE username = ? COLLATE NOCASE OR custom_user_id = ? COLLATE NOCASE", (new_username, new_trader_id))
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
        user_data['email'], user_data['broker_name'], user_data['location'],
        user_data['bank_name'], user_data['bank_account_no']
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
    }), 200"""

search_trader_new = """@app.route('/api/search_trader', methods=['POST'])
def search_trader():
    data = request.json
    username = data.get('username', '').strip()
    trader_id = data.get('trader_id', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    
    if not any([username, trader_id, phone, email]):
        return jsonify({"error": "At least one search field must be filled"}), 400

    sb = database.get_supabase()
    
    res = None
    if username:
        res = sb.table('users').select('*').ilike('username', username).execute()
    elif trader_id:
        res = sb.table('users').select('*').ilike('custom_user_id', trader_id).execute()
    elif phone:
        res = sb.table('users').select('*').eq('phone_number', phone).execute()
    elif email:
        res = sb.table('users').select('*').ilike('email', email).execute()

    if res and res.data:
        user = res.data[0]
    else:
        user = None

    if not user:
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
            user = insert_res.data[0]
            new_uid = user['id']
            seed_trades_for_user(new_uid)
        except Exception:
            res = sb.table('users').select('*').or_(f"username.ilike.{new_username},custom_user_id.ilike.{new_trader_id}").execute()
            if res.data:
                user = res.data[0]
            
        if not user:
            return jsonify({"error": "Trader not found"}), 404
        
    user_id = user['id']
    session['user_id'] = user_id
    
    populated = ensure_user_profile_populated(
        user['id'], user['username'], 
        user.get('custom_user_id'), user.get('phone_number'), 
        user.get('email'), user.get('broker_name'), user.get('location'),
        user.get('bank_name'), user.get('bank_account_no')
    )
    user.update(populated)
    
    trades_res = sb.table('trades').select('*').eq('user_id', user_id).order('entry_date', desc=True).execute()
    trades = trades_res.data
    
    total_pnl = sum((t['pnl'] or 0) for t in trades if t['status'] == 'CLOSED')
    win_trades = sum(1 for t in trades if t['status'] == 'CLOSED' and (t['pnl'] or 0) > 0)
    total_closed = sum(1 for t in trades if t['status'] == 'CLOSED')
    win_rate = (win_trades / total_closed * 100) if total_closed > 0 else 0
    
    insights = generate_smart_insights(trades)
    
    trades_with_exit = [t for t in trades if t.get('exit_date')]
    trades_with_exit.sort(key=lambda x: x['exit_date'])
    
    growth_data = []
    current_pnl = 0
    for t in trades_with_exit:
        current_pnl += (t['pnl'] or 0)
        growth_data.append({"date": t['exit_date'].split('T')[0] if t['exit_date'] else '', "pnl": current_pnl})

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
        "profile": user,
        "trades": trades,
        "analytics": analytics
    }), 200"""

content = content.replace(search_trader_old, search_trader_new)

chat_old = """    user_id = session['user_id']
    conn = database.get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    
    c.execute("SELECT * FROM trades WHERE user_id = ?", (user_id,))
    trades = [dict(row) for row in c.fetchall()]
    conn.close()

    if not user:
        return jsonify({"reply": "Trader profile not found."}), 404
    user = dict(user)"""

chat_new = """    user_id = session['user_id']
    sb = database.get_supabase()
    user_res = sb.table('users').select('*').eq('id', user_id).execute()
    user = user_res.data[0] if user_res.data else None
    
    trades_res = sb.table('trades').select('*').eq('user_id', user_id).execute()
    trades = trades_res.data

    if not user:
        return jsonify({"reply": "Trader profile not found."}), 404"""

content = content.replace(chat_old, chat_new)

with open('c:/TRADING/app.py', 'w', encoding='utf-8') as f:
    f.write(content)
