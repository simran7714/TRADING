document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = null;
    let equityChartInstance = null;
    let pnlChartInstance = null;
    let tvChartInstance = null;
    let currentTrades = [];

    // --- DOM Elements ---
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    const authForm = document.getElementById('auth-form');
    const authError = document.getElementById('auth-error');
    const toggleAuthLink = document.getElementById('toggle-auth');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');

    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.section');

    // AI Search
    const aiSearchForm = document.getElementById('ai-search-form');
    const aiSearchError = document.getElementById('ai-search-error');

    // Modal
    const newTradeBtn = document.getElementById('new-trade-btn');
    const tradeModal = document.getElementById('trade-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const tradeForm = document.getElementById('trade-form');

    // Profile Modal
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileForm = document.getElementById('profile-form');
    const profileUserIdInput = document.getElementById('profile-user-id');
    const profilePhoneInput = document.getElementById('profile-phone');
    const profileEmailInput = document.getElementById('profile-email');
    const profileBrokerInput = document.getElementById('profile-broker');
    const profileJoinedDateInput = document.getElementById('profile-joined-date');
    const profileLocationInput = document.getElementById('profile-location');
    const profileBalanceInput = document.getElementById('profile-balance');

    // Dashboard Metrics
    const metricPnl = document.getElementById('metric-pnl');
    const metricWinrate = document.getElementById('metric-winrate');
    const metricTrades = document.getElementById('metric-trades');
    const tradesTbody = document.getElementById('trades-tbody');
    const aiInsightsContent = document.getElementById('ai-insights-content');

    let isLoginMode = true;

    // --- Authentication ---
    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authSubmitBtn.textContent = 'Login';
            document.getElementById('auth-toggle-text').innerHTML = `Don't have an account? <a href="#" id="toggle-auth">Register</a>`;
            document.getElementById('phone-group').style.display = 'none';
            document.getElementById('email-group').style.display = 'none';
            document.getElementById('broker-group').style.display = 'none';
            document.getElementById('balance-group').style.display = 'none';
        } else {
            authSubmitBtn.textContent = 'Register';
            document.getElementById('auth-toggle-text').innerHTML = `Already have an account? <a href="#" id="toggle-auth">Login</a>`;
            document.getElementById('phone-group').style.display = 'block';
            document.getElementById('email-group').style.display = 'block';
            document.getElementById('broker-group').style.display = 'block';
            document.getElementById('balance-group').style.display = 'block';
        }
        // Re-attach event listener
        document.getElementById('toggle-auth').addEventListener('click', arguments.callee);
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const username = usernameInput.value;
        const password = passwordInput.value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const broker = document.getElementById('broker').value;
        const balance = document.getElementById('balance').value;
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

        const bodyData = { username, password };
        if (!isLoginMode) {
            bodyData.phone_number = phone;
            bodyData.email = email;
            bodyData.broker_name = broker;
            bodyData.balance = balance ? parseFloat(balance) : 10000.0;
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();

            if (res.ok) {
                if (!isLoginMode) {
                    // Registration success, switch to login
                    isLoginMode = true;
                    authSubmitBtn.textContent = 'Login';
                    document.getElementById('auth-toggle-text').innerHTML = `Don't have an account? <a href="#" id="toggle-auth">Register</a>`;
                    authError.textContent = 'Registration successful. Please log in.';
                    authError.style.color = 'var(--success)';
                } else {
                    // Login success
                    checkSession();
                }
            } else {
                authError.textContent = data.error || 'Authentication failed';
                authError.style.color = 'var(--danger)';
            }
        } catch (err) {
            authError.textContent = 'Network error. Please try again.';
            authError.style.color = 'var(--danger)';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        showAuth();
    });

    let userDetails = null;

    // Check Session
    async function checkSession() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                userDetails = await res.json();
                currentUser = userDetails.username;
                showDashboard();
            } else {
                showAuth();
            }
        } catch (err) {
            showAuth();
        }
    }

    function showAuth() {
        dashboardView.classList.remove('active');
        authView.classList.add('active');
        usernameInput.value = '';
        passwordInput.value = '';
    }

    function showDashboard(isSearchResult = false) {
        authView.classList.remove('active');
        dashboardView.classList.add('active');
        userDisplay.textContent = currentUser;

        if (userDetails) {
            document.getElementById('user-id-display').textContent = `ID: ${userDetails.custom_user_id || userDetails.id || '-'}`;
            document.getElementById('user-broker-display').textContent = `Broker: ${userDetails.broker_name || '-'}`;
            document.getElementById('user-phone-display').textContent = `Phone: ${userDetails.phone_number || '-'}`;

            // Add email display if it doesn't exist
            let emailDisplay = document.getElementById('user-email-display');
            if (!emailDisplay) {
                emailDisplay = document.createElement('p');
                emailDisplay.id = 'user-email-display';
                emailDisplay.className = 'detail-text';
                document.getElementById('user-phone-display').after(emailDisplay);
            }
            emailDisplay.textContent = `Email: ${userDetails.email || '-'}`;

            const locationDisplay = document.getElementById('user-location-display');
            if (locationDisplay) {
                locationDisplay.textContent = `Location: ${userDetails.location || '-'}`;
            }

            const loginDate = new Date();
            const formattedLogin = loginDate.getFullYear() + '-' +
                String(loginDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(loginDate.getDate()).padStart(2, '0') + ' ' +
                String(loginDate.getHours()).padStart(2, '0') + ':' +
                String(loginDate.getMinutes()).padStart(2, '0');
            document.getElementById('user-date-display').textContent = `Logged In: ${formattedLogin}`;
        }

        if (!isSearchResult) {
            loadDashboardData();
        }
    }

    // --- Navigation ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');

            const targetId = link.getAttribute('data-target');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            const topbarHeader = document.querySelector('.topbar h1');
            if (topbarHeader) {
                topbarHeader.textContent = link.textContent;
            }
        });
    });

    // --- Modal ---
    newTradeBtn.addEventListener('click', () => {
        tradeModal.classList.add('active');
        document.getElementById('trade-modal-title').textContent = 'Log Trade';
        document.getElementById('trade-id').value = '';
        tradeForm.reset();
        document.getElementById('trade-entry-date').valueAsDate = new Date();
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tradeModal.classList.remove('active');
            profileModal.classList.remove('active');
            document.getElementById('trade-id').value = '';
            tradeForm.reset();
            profileForm.reset();
        });
    });

    editProfileBtn.addEventListener('click', () => {
        if (userDetails) {
            profileUserIdInput.value = userDetails.custom_user_id || '';
            profilePhoneInput.value = userDetails.phone_number || '';
            profileEmailInput.value = userDetails.email || '';
            profileBrokerInput.value = userDetails.broker_name || '';
            profileJoinedDateInput.value = new Date().toISOString().split('T')[0];
            if (profileLocationInput) {
                profileLocationInput.value = userDetails.location || '';
            }
            if (profileBalanceInput) {
                profileBalanceInput.value = userDetails.balance !== undefined ? userDetails.balance : 10000.0;
            }
        }
        profileModal.classList.add('active');
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const profileData = {
            custom_user_id: profileUserIdInput.value,
            phone_number: profilePhoneInput.value,
            email: profileEmailInput.value,
            broker_name: profileBrokerInput.value,
            created_at: profileJoinedDateInput.value,
            location: profileLocationInput ? profileLocationInput.value : '',
            balance: profileBalanceInput ? parseFloat(profileBalanceInput.value) : 10000.0
        };

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            if (res.ok) {
                profileModal.classList.remove('active');
                checkSession(); // refresh user details
            } else if (res.status === 401) {
                alert('Session expired. Please log in again.');
                currentUser = null;
                showAuth();
                profileModal.classList.remove('active');
            } else {
                alert('Failed to update profile.');
            }
        } catch (err) {
            alert('Error updating profile.');
        }
    });

    tradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tradeData = {
            symbol: document.getElementById('trade-symbol').value,
            trade_type: document.getElementById('trade-type').value,
            quantity: document.getElementById('trade-quantity').value,
            status: document.getElementById('trade-status').value,
            entry_price: document.getElementById('trade-entry').value,
            exit_price: document.getElementById('trade-exit').value || null,
            entry_date: document.getElementById('trade-entry-date').value,
            exit_date: document.getElementById('trade-exit-date').value || null
        };

        const tradeId = document.getElementById('trade-id').value;
        const method = tradeId ? 'PUT' : 'POST';
        const url = tradeId ? `/api/trades/${tradeId}` : '/api/trades';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tradeData)
            });
            if (res.ok) {
                tradeModal.classList.remove('active');
                tradeForm.reset();
                document.getElementById('trade-id').value = '';
                loadDashboardData();
            } else if (res.status === 401) {
                alert('Session expired. Please log in again.');
                currentUser = null;
                showAuth();
                tradeModal.classList.remove('active');
            } else {
                alert('Failed to save trade.');
            }
        } catch (err) {
            alert('Error saving trade.');
        }
    });

    // --- AI Smart Autocomplete & Autofill ---
    const searchUsernameInput = document.getElementById('ai-search-username');
    const searchUsernameOptions = document.getElementById('search-username-options');

    if (searchUsernameInput) {
        searchUsernameInput.addEventListener('input', async () => {
            const val = searchUsernameInput.value.trim();
            if (!val) {
                searchUsernameOptions.innerHTML = '';
                return;
            }

            try {
                const res = await fetch(`/api/autocomplete_trader?username=${encodeURIComponent(val)}`);
                if (res.ok) {
                    const data = await res.json();

                    // Update datalist options
                    searchUsernameOptions.innerHTML = '';
                    data.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.username;
                        searchUsernameOptions.appendChild(opt);
                    });

                    // If there is an exact match, auto-fill the other inputs!
                    const match = data.find(item => item.username.toLowerCase() === val.toLowerCase());
                    if (match) {
                        document.getElementById('ai-search-id').value = match.custom_user_id || '';
                        const phoneField = document.getElementById('ai-search-phone');
                        if (phoneField) phoneField.value = match.phone_number || '';
                        const emailField = document.getElementById('ai-search-email');
                        if (emailField) emailField.value = match.email || '';
                    }
                }
            } catch (err) {
                console.error("Autocomplete error", err);
            }
        });
    }

    if (aiSearchForm) {
        aiSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            aiSearchError.textContent = '';

            const username = document.getElementById('ai-search-username').value.trim();
            const trader_id = document.getElementById('ai-search-id').value.trim();
            const phoneField = document.getElementById('ai-search-phone');
            const phone = phoneField ? phoneField.value.trim() : '';
            const emailField = document.getElementById('ai-search-email');
            const email = emailField ? emailField.value.trim() : '';

            if (!username && !trader_id && !phone && !email) {
                aiSearchError.textContent = 'Please fill out at least one field.';
                return;
            }

            const searchBtn = aiSearchForm.querySelector('button');
            const originalText = searchBtn.textContent;
            searchBtn.textContent = '⏳';

            try {
                const res = await fetch('/api/search_trader', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, trader_id, phone, email })
                });

                const data = await res.json();
                searchBtn.textContent = originalText;

                if (res.ok) {
                    // Populate dashboard directly with search data
                    userDetails = data.profile;
                    currentUser = userDetails.username;

                    showDashboard(true);

                    // Render fetched data directly
                    renderTrades(data.trades);
                    renderHistory();
                    renderTradeBlocks(data.trades);
                    renderMetrics(data.analytics);
                    renderInsights(data.analytics.insights);
                    renderTVChart();



                } else {
                    aiSearchError.textContent = data.error || 'Trader not found';
                }
            } catch (err) {
                searchBtn.textContent = originalText;
                aiSearchError.textContent = 'Error during search';
            }
        });
    }
    // --- Mutual Exclusivity between Search and Login ---
    const loginInputs = [
        document.getElementById('username'),
        document.getElementById('phone'),
        document.getElementById('email'),
        document.getElementById('broker'),
        document.getElementById('password')
    ];
    const aiSearchInputs = [
        document.getElementById('ai-search-username'),
        document.getElementById('ai-search-id'),
        document.getElementById('ai-search-phone'),
        document.getElementById('ai-search-email')
    ].filter(Boolean);

    loginInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                aiSearchInputs.forEach(aiInput => {
                    if (aiInput) aiInput.value = '';
                });
            });
        }
    });

    aiSearchInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                loginInputs.forEach(loginInput => {
                    if (loginInput) loginInput.value = '';
                });
            });
        }
    });

    // --- Data Loading ---
    async function loadDashboardData() {
        try {
            const [tradesRes, analyticsRes] = await Promise.all([
                fetch('/api/trades'),
                fetch('/api/analytics')
            ]);

            if (tradesRes.status === 401 || analyticsRes.status === 401) {
                currentUser = null;
                showAuth();
                return;
            }

            const trades = await tradesRes.json();
            const analytics = await analyticsRes.json();

            renderTrades(trades);
            renderHistory();
            renderTradeBlocks(trades);
            renderMetrics(analytics, trades);
            renderInsights(analytics.insights);
            renderTVChart();

        } catch (err) {
            console.error('Error loading dashboard data', err);
        }
    }

    function renderTrades(trades) {
        currentTrades = trades; // Store current trades state
        if (!tradesTbody) return;
        tradesTbody.innerHTML = '';
        trades.forEach(trade => {
            const tr = document.createElement('tr');

            const pnlClass = trade.pnl > 0 ? 'positive' : (trade.pnl < 0 ? 'negative' : '');
            const pnlText = trade.pnl !== null ? `₹${trade.pnl.toFixed(2)}` : '-';

            tr.innerHTML = `
                <td>${trade.entry_date}</td>
                <td><strong>${trade.symbol}</strong></td>
                <td><span class="badge ${trade.trade_type.toLowerCase()}">${trade.trade_type}</span></td>
                <td>₹${trade.entry_price.toFixed(2)}</td>
                <td>${trade.exit_price ? '₹' + trade.exit_price.toFixed(2) : '-'}</td>
                <td><span class="badge ${trade.status.toLowerCase()}">${trade.status}</span></td>
                <td class="${pnlClass}">${pnlText}</td>
                <td>
                    <button class="edit-btn" onclick="editTrade(${trade.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteTrade(${trade.id})">Delete</button>
                </td>
            `;
            tradesTbody.appendChild(tr);
        });
    }

    function renderHistory() {
        const symbolFilterInput = document.getElementById('history-search-symbol');
        const typeFilterInput = document.getElementById('history-filter-type');
        const symbolFilter = symbolFilterInput ? symbolFilterInput.value.toUpperCase() : '';
        const typeFilter = typeFilterInput ? typeFilterInput.value : 'ALL';
        const tbody = document.getElementById('history-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Filter closed trades
        const closedTrades = currentTrades.filter(t => t.status === 'CLOSED');

        // Calculate holding times and statistics for Trade History summary cards
        let totalHoldDays = 0;
        let holdCount = 0;
        let winHoldDays = 0, winHoldCount = 0;
        let lossHoldDays = 0, lossHoldCount = 0;
        let winningCount = 0;
        let losingCount = 0;
        let totalRealizedPnl = 0;

        closedTrades.forEach(t => {
            const pnl = t.pnl || 0;
            totalRealizedPnl += pnl;
            if (pnl > 0) {
                winningCount++;
            } else if (pnl < 0) {
                losingCount++;
            }

            if (t.entry_date && t.exit_date) {
                const entryStr = t.entry_date.trim().replace(' ', 'T');
                const exitStr = t.exit_date.trim().replace(' ', 'T');
                const entry = new Date(entryStr);
                const exit = new Date(exitStr);
                if (!isNaN(entry) && !isNaN(exit)) {
                    const diffTime = exit - entry;
                    if (diffTime >= 0) {
                        const days = diffTime / (1000 * 60 * 60 * 24);
                        totalHoldDays += days;
                        holdCount++;
                        if (pnl > 0) {
                            winHoldDays += days;
                            winHoldCount++;
                        } else if (pnl < 0) {
                            lossHoldDays += days;
                            lossHoldCount++;
                        }
                    }
                }
            }
        });

        const avgHoldTimeStr = holdCount > 0 ? `${(totalHoldDays / holdCount).toFixed(1)} days` : '-';
        const winHoldTimeStr = winHoldCount > 0 ? `${(winHoldDays / winHoldCount).toFixed(1)} days` : '-';
        const lossHoldTimeStr = lossHoldCount > 0 ? `${(lossHoldDays / lossHoldCount).toFixed(1)} days` : '-';

        const totalTradesCount = closedTrades.length;
        const winRate = totalTradesCount > 0 ? ((winningCount / totalTradesCount) * 100) : 0;
        const lossRate = totalTradesCount > 0 ? ((losingCount / totalTradesCount) * 100) : 0;
        const winLossStr = totalTradesCount > 0 ? `${winRate.toFixed(1)}% / ${lossRate.toFixed(1)}%` : '-';

        // Update DOM elements in History Section
        const historyHoldOverall = document.getElementById('history-hold-overall');
        const historyHoldWinning = document.getElementById('history-hold-winning');
        const historyHoldLosing = document.getElementById('history-hold-losing');
        const historyTotalClosed = document.getElementById('history-total-closed');
        const historyWinLoss = document.getElementById('history-win-loss');
        const historyRealizedPnl = document.getElementById('history-realized-pnl');

        if (historyHoldOverall) historyHoldOverall.textContent = avgHoldTimeStr;
        if (historyHoldWinning) historyHoldWinning.textContent = winHoldTimeStr;
        if (historyHoldLosing) historyHoldLosing.textContent = lossHoldTimeStr;
        if (historyTotalClosed) historyTotalClosed.textContent = totalTradesCount;
        if (historyWinLoss) historyWinLoss.textContent = winLossStr;
        if (historyRealizedPnl) {
            historyRealizedPnl.textContent = `₹${totalRealizedPnl.toFixed(2)}`;
            historyRealizedPnl.className = totalRealizedPnl > 0 ? 'positive' : (totalRealizedPnl < 0 ? 'negative' : '');
        }

        const filtered = closedTrades.filter(t => {
            const matchesSymbol = t.symbol.toUpperCase().includes(symbolFilter);
            const matchesType = typeFilter === 'ALL' || t.trade_type === typeFilter;
            return matchesSymbol && matchesType;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">No historical trades found.</td></tr>`;
            return;
        }

        filtered.forEach(trade => {
            const tr = document.createElement('tr');
            const pnlClass = trade.pnl > 0 ? 'positive' : (trade.pnl < 0 ? 'negative' : '');
            const pnlText = trade.pnl !== null ? `₹${trade.pnl.toFixed(2)}` : '-';

            tr.innerHTML = `
                <td>${trade.entry_date}</td>
                <td>${trade.exit_date || '-'}</td>
                <td><strong>${trade.symbol}</strong></td>
                <td><span class="badge ${trade.trade_type.toLowerCase()}">${trade.trade_type}</span></td>
                <td>${trade.quantity}</td>
                <td>₹${trade.entry_price.toFixed(2)}</td>
                <td>${trade.exit_price ? '₹' + trade.exit_price.toFixed(2) : '-'}</td>
                <td class="${pnlClass}">${pnlText}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderTradeBlocks(trades) {
        const grid = document.getElementById('overview-trades-grid');
        grid.innerHTML = '';

        // Only show up to 6 most recent trades on the overview
        const recentTrades = trades.slice(0, 6);

        if (recentTrades.length === 0) {
            grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1;">No trades logged yet.</p>';
            return;
        }

        recentTrades.forEach(trade => {
            const block = document.createElement('div');
            block.className = 'trade-block';

            const pnlClass = trade.pnl > 0 ? 'positive' : (trade.pnl < 0 ? 'negative' : '');
            const pnlText = trade.pnl !== null ? `₹${trade.pnl.toFixed(2)}` : 'Open';
            const pnlPrefix = trade.pnl > 0 ? '+' : '';

            block.innerHTML = `
                <div class="trade-block-header">
                    <span class="trade-block-symbol">${trade.symbol}</span>
                    <span class="badge ${trade.trade_type.toLowerCase()}">${trade.trade_type}</span>
                </div>
                <div class="trade-block-details">
                    <span>Entry: ₹${trade.entry_price.toFixed(2)}</span>
                    <span>${trade.status}</span>
                </div>
                <div class="trade-block-pnl ${pnlClass}">
                    ${pnlPrefix}${pnlText}
                </div>
                <div class="trade-block-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px; border-top: 1px solid var(--border); padding-top: 8px;">
                    <div>
                        <button class="edit-btn" onclick="editTrade(${trade.id})" style="background: none; border: none; color: var(--accent); cursor: pointer; font-size: 0.8rem; padding: 0; margin-right: 10px;">Edit</button>
                        <button class="delete-btn-text" onclick="deleteTrade(${trade.id})" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.8rem; padding: 0;">Delete</button>
                    </div>
                    <span style="font-size: 0.725rem; color: var(--text-secondary);">${trade.entry_date}</span>
                </div>
            `;
            grid.appendChild(block);
        });
    }

    window.deleteTrade = async function (id) {
        if (confirm('Are you sure you want to delete this trade?')) {
            const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
            if (res.status === 401) {
                currentUser = null;
                showAuth();
            } else {
                loadDashboardData();
            }
        }
    };

    window.editTrade = function (id) {
        const trade = currentTrades.find(t => t.id === id);
        if (!trade) {
            alert("Trade details not found.");
            return;
        }

        document.getElementById('trade-modal-title').textContent = 'Edit Trade';
        document.getElementById('trade-id').value = trade.id;
        document.getElementById('trade-symbol').value = trade.symbol;
        document.getElementById('trade-type').value = trade.trade_type;
        document.getElementById('trade-quantity').value = trade.quantity;
        document.getElementById('trade-status').value = trade.status;
        document.getElementById('trade-entry').value = trade.entry_price;
        document.getElementById('trade-exit').value = trade.exit_price !== null ? trade.exit_price : '';

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            return dateStr.split(' ')[0];
        };
        document.getElementById('trade-entry-date').value = formatDate(trade.entry_date);
        document.getElementById('trade-exit-date').value = formatDate(trade.exit_date);

        tradeModal.classList.add('active');
    };

    function renderMetrics(analytics, trades) {
        const baseBalance = userDetails ? (userDetails.balance || 0) : 0;
        const currentBalance = baseBalance + analytics.total_pnl;
        document.getElementById('metric-balance').textContent = `₹${currentBalance.toFixed(2)}`;
        document.getElementById('metric-balance').className = 'metric-value ' + (currentBalance > baseBalance ? 'positive' : (currentBalance < baseBalance ? 'negative' : ''));

        metricPnl.textContent = `₹${analytics.total_pnl.toFixed(2)}`;
        metricPnl.className = 'metric-value ' + (analytics.total_pnl > 0 ? 'positive' : (analytics.total_pnl < 0 ? 'negative' : ''));

        metricWinrate.textContent = `${analytics.win_rate.toFixed(1)}%`;
        metricTrades.textContent = analytics.total_closed;
        // Update win/loss rate in performance status
        const lossRate = analytics.total_closed > 0 ? (100 - analytics.win_rate).toFixed(1) : 0;
        document.getElementById('performance-winrate').textContent = `Win Rate: ${analytics.win_rate.toFixed(1)}%`;
        document.getElementById('performance-losrate').textContent = `Loss Rate: ${lossRate}%`;

        // Calculate holding times
        const closedTrades = trades ? trades.filter(t => t.status === 'CLOSED') : [];
        let totalHoldDays = 0;
        let holdCount = 0;
        let winHoldDays = 0, winHoldCount = 0;
        let lossHoldDays = 0, lossHoldCount = 0;

        closedTrades.forEach(t => {
            if (t.entry_date && t.exit_date) {
                const entryStr = t.entry_date.trim().replace(' ', 'T');
                const exitStr = t.exit_date.trim().replace(' ', 'T');
                const entry = new Date(entryStr);
                const exit = new Date(exitStr);
                if (!isNaN(entry) && !isNaN(exit)) {
                    const diffTime = exit - entry;
                    if (diffTime >= 0) {
                        const days = diffTime / (1000 * 60 * 60 * 24);
                        totalHoldDays += days;
                        holdCount++;
                        if (t.pnl > 0) {
                            winHoldDays += days;
                            winHoldCount++;
                        } else if (t.pnl < 0) {
                            lossHoldDays += days;
                            lossHoldCount++;
                        }
                    }
                }
            }
        });
        const avgHoldTimeStr = holdCount > 0 ? `${(totalHoldDays / holdCount).toFixed(1)}d` : '-';
        const holdTimeElement = document.getElementById('performance-holdtime');
        if (holdTimeElement) {
            holdTimeElement.textContent = `Time: ${avgHoldTimeStr}`;
        }

        // Render Performance Status
        const performanceBadge = document.getElementById('metric-performance-badge');
        const performanceDesc = document.getElementById('metric-performance-desc');
        if (performanceBadge && performanceDesc) {
            let label = 'No Data';
            let desc = 'Log closed trades to evaluate';
            let bg = 'rgba(148, 163, 184, 0.1)';
            let color = '#94a3b8';
            let borderColor = 'rgba(148, 163, 184, 0.2)';

            if (analytics.total_closed > 0) {
                if (analytics.win_rate >= 60 && analytics.total_pnl > 0) {
                    label = 'Excellent';
                    desc = 'Highly profitable trading setup';
                    bg = 'rgba(16, 185, 129, 0.1)';
                    color = '#10b981';
                    borderColor = 'rgba(16, 185, 129, 0.2)';
                } else if (analytics.win_rate >= 50 || analytics.total_pnl > 0) {
                    label = 'Good';
                    desc = 'Consistent positive performance';
                    bg = 'rgba(99, 102, 241, 0.1)';
                    color = '#6366f1';
                    borderColor = 'rgba(99, 102, 241, 0.2)';
                } else {
                    label = 'Underperforming';
                    desc = 'Refine risk & entry criteria';
                    bg = 'rgba(239, 68, 68, 0.1)';
                    color = '#ef4444';
                    borderColor = 'rgba(239, 68, 68, 0.2)';
                }
            }

            performanceBadge.textContent = label;
            performanceBadge.style.background = bg;
            performanceBadge.style.color = color;
            performanceBadge.style.borderColor = borderColor;
            performanceDesc.textContent = desc;
        }

        // Add click listeners for subtopics
        const winRateLink = document.getElementById('performance-winrate');
        const lossRateLink = document.getElementById('performance-losrate');
        const holdTimeLink = document.getElementById('performance-holdtime');
        const historyLink = document.getElementById('performance-history');
        if (winRateLink) {
            winRateLink.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`Win Rate: ${analytics.win_rate.toFixed(1)}%`);
            });
        }
        if (lossRateLink) {
            lossRateLink.addEventListener('click', (e) => {
                e.preventDefault();
                const lossRate = analytics.total_closed > 0 ? (100 - analytics.win_rate).toFixed(1) : 0;
                alert(`Loss Rate: ${lossRate}%`);
            });
        }
        if (holdTimeLink) {
            holdTimeLink.addEventListener('click', (e) => {
                e.preventDefault();
                const avgTotal = holdCount > 0 ? `${(totalHoldDays / holdCount).toFixed(1)} days` : 'N/A';
                const avgWin = winHoldCount > 0 ? `${(winHoldDays / winHoldCount).toFixed(1)} days` : 'N/A';
                const avgLoss = lossHoldCount > 0 ? `${(lossHoldDays / lossHoldCount).toFixed(1)} days` : 'N/A';
                alert(`Average Holding Time:\n• Overall: ${avgTotal}\n• Winning Trades: ${avgWin}\n• Losing Trades: ${avgLoss}`);
            });
        }
        if (historyLink) {
            historyLink.addEventListener('click', (e) => {
                e.preventDefault();
                const navBtn = document.querySelector('.sidebar-nav a[data-target="history-section"]');
                if (navBtn) {
                    navBtn.click();
                }
            });
        }
        // End of subtopic listeners

        // Render Risk Meter
        if (analytics.risk) {
            const score = analytics.risk.score;
            document.getElementById('risk-score-display').textContent = score;
            document.getElementById('risk-level-display').textContent = analytics.risk.level;
            document.getElementById('risk-level-display').style.color = analytics.risk.color;
            document.getElementById('risk-description').textContent = analytics.risk.label;
            document.getElementById('risk-detail-losses').textContent = analytics.risk.max_consecutive_losses;
            document.getElementById('risk-detail-exposure').textContent = analytics.risk.open_exposure;

            // SVG Stroke offset calculation: Circumference = 2 * PI * R (40) = 251.2
            const circumference = 251.2;
            const offset = circumference - (score / 100) * circumference;
            const fillCircle = document.getElementById('risk-fill');
            if (fillCircle) {
                fillCircle.style.strokeDashoffset = offset;
                fillCircle.style.stroke = analytics.risk.color;
            }
        }

        // Render Fraud Detection System
        if (analytics.fraud) {
            const f = analytics.fraud;
            document.getElementById('fraud-score-display').textContent = f.score;
            document.getElementById('fraud-description').textContent = f.label;

            const badge = document.getElementById('fraud-status-badge');
            if (badge) {
                badge.textContent = f.status;
                badge.style.backgroundColor = f.color;
            }

            const circumference = 251.2;
            const offset = circumference - (f.score / 100) * circumference;
            const fillCircle = document.getElementById('fraud-fill');
            if (fillCircle) {
                fillCircle.style.strokeDashoffset = offset;
                fillCircle.style.stroke = f.color;
            }

            const alertList = document.getElementById('fraud-alerts-list');
            if (alertList) {
                alertList.innerHTML = '';
                if (f.flags.length === 0) {
                    alertList.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #00e676; font-weight: 500; font-size: 0.8rem; width: 100%;">
                            ✓ Integrity checks verified.
                        </div>
                    `;
                } else {
                    f.flags.forEach(flag => {
                        const div = document.createElement('div');
                        div.style.padding = '0.35rem 0.5rem';
                        div.style.borderRadius = '6px';
                        div.style.backgroundColor = flag.severity === 'HIGH' ? 'rgba(255, 23, 68, 0.1)' : 'rgba(255, 145, 0, 0.1)';
                        div.style.borderLeft = `3px solid ${flag.severity === 'HIGH' ? '#ff1744' : '#ff9100'}`;
                        div.style.color = '#fff';
                        div.style.marginBottom = '0.2rem';
                        div.textContent = flag.message;
                        alertList.appendChild(div);
                    });
                }
            }
        }

        // Render Buy/Sell Performance Tracker
        if (analytics.buy_sell_stats) {
            const stats = analytics.buy_sell_stats;
            const buyCount = stats.buy.count;
            const sellCount = stats.sell.count;
            const totalCount = buyCount + sellCount;
            
            let buyPct = 50;
            let sellPct = 50;
            if (totalCount > 0) {
                buyPct = Math.round((buyCount / totalCount) * 100);
                sellPct = 100 - buyPct;
            }
            
            // Update labels
            const buyRatioText = document.getElementById('buy-ratio-text');
            const sellRatioText = document.getElementById('sell-ratio-text');
            if (buyRatioText) buyRatioText.textContent = `BUY: ${buyPct}%`;
            if (sellRatioText) sellRatioText.textContent = `SELL: ${sellPct}%`;
            
            // Update progress bar widths
            const buyRatioFill = document.getElementById('buy-ratio-fill');
            const sellRatioFill = document.getElementById('sell-ratio-fill');
            if (buyRatioFill) buyRatioFill.style.width = `${buyPct}%`;
            if (sellRatioFill) sellRatioFill.style.width = `${sellPct}%`;
            
            // Update detail value labels
            const buyCountVal = document.getElementById('buy-count-val');
            const buyWinrateVal = document.getElementById('buy-winrate-val');
            const buyPnlVal = document.getElementById('buy-pnl-val');
            
            const sellCountVal = document.getElementById('sell-count-val');
            const sellWinrateVal = document.getElementById('sell-winrate-val');
            const sellPnlVal = document.getElementById('sell-pnl-val');
            
            if (buyCountVal) buyCountVal.textContent = buyCount;
            if (buyWinrateVal) buyWinrateVal.textContent = `${stats.buy.win_rate}%`;
            if (buyPnlVal) {
                buyPnlVal.textContent = (stats.buy.pnl >= 0 ? '+' : '') + `₹${stats.buy.pnl.toFixed(2)}`;
                buyPnlVal.className = stats.buy.pnl > 0 ? 'positive' : (stats.buy.pnl < 0 ? 'negative' : '');
            }
            
            if (sellCountVal) sellCountVal.textContent = sellCount;
            if (sellWinrateVal) sellWinrateVal.textContent = `${stats.sell.win_rate}%`;
            if (sellPnlVal) {
                sellPnlVal.textContent = (stats.sell.pnl >= 0 ? '+' : '') + `₹${stats.sell.pnl.toFixed(2)}`;
                sellPnlVal.className = stats.sell.pnl > 0 ? 'positive' : (stats.sell.pnl < 0 ? 'negative' : '');
            }
            
            // Dominant badge logic
            const dominantBadge = document.getElementById('buy-sell-dominant-badge');
            if (dominantBadge) {
                if (buyCount > sellCount) {
                    dominantBadge.textContent = 'BUY DOMINANT';
                    dominantBadge.style.backgroundColor = '#10b981';
                } else if (sellCount > buyCount) {
                    dominantBadge.textContent = 'SELL DOMINANT';
                    dominantBadge.style.backgroundColor = '#ef4444';
                } else {
                    dominantBadge.textContent = 'NEUTRAL';
                    dominantBadge.style.backgroundColor = 'var(--accent)';
                }
            }
        }
    }

    function renderInsights(insights) {
        if (!aiInsightsContent) return;
        aiInsightsContent.innerHTML = '';
        if (insights.length === 0) {
            aiInsightsContent.innerHTML = '<p>Not enough data for AI insights yet. Close some trades!</p>';
            return;
        }
        insights.forEach(insight => {
            const p = document.createElement('p');
            p.textContent = insight;
            aiInsightsContent.appendChild(p);
        });
    }

    function renderTVChart() {
        const container = document.getElementById('tv-chart');

        if (tvChartInstance) {
            return; // Only initialize once
        }

        // Initialize TradingView Lightweight Chart
        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: 'solid', color: '#1a1d2d' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
        });

        tvChartInstance = chart;

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        // Generate realistic mock OHLC data
        const data = [];
        // Start date a few months ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 150);
        let time = Math.floor(startDate.getTime() / 1000);
        let currentPrice = 40000;

        for (let i = 0; i < 150; i++) {
            const volatility = currentPrice * 0.015;
            const open = currentPrice + (Math.random() - 0.5) * volatility;
            const high = open + Math.random() * volatility;
            const low = open - Math.random() * volatility;
            const close = (low + high) / 2 + (Math.random() - 0.5) * volatility;

            data.push({
                time: time,
                open: open,
                high: Math.max(open, close, high),
                low: Math.min(open, close, low),
                close: close
            });

            currentPrice = close;
            time += 24 * 60 * 60; // Add 1 day
        }

        candlestickSeries.setData(data);

        // Add some mock SMC annotations via markers
        const markers = [
            { time: data[30].time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: 'Liquidity Sweep' },
            { time: data[70].time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Bearish Order Block' },
            { time: data[100].time, position: 'belowBar', color: '#10b981', shape: 'arrowUp', text: 'FVG Mitigation' },
            { time: data[140].time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'CHOCH' }
        ];

        candlestickSeries.setMarkers(markers);

        // Fit content
        chart.timeScale().fitContent();

        // Handle resize
        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) { return; }
            const newRect = entries[0].contentRect;
            chart.applyOptions({ height: newRect.height, width: newRect.width });
        }).observe(container);
    }

    // --- AI Chatbot Assistant ---
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (chatToggleBtn && chatCloseBtn && chatWindow) {
        chatToggleBtn.addEventListener('click', () => {
            chatWindow.classList.toggle('active');
            chatInput.focus();
        });

        chatCloseBtn.addEventListener('click', () => {
            chatWindow.classList.remove('active');
        });
    }

    if (chatForm && chatInput && chatMessages) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;

            // Append user message
            appendChatMessage(message, 'user');
            chatInput.value = '';

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Send to API
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });

                if (res.status === 401) {
                    appendChatMessage("You are logged out. Please search for a trader to log back in.", 'system');
                    return;
                }

                const data = await res.json();
                appendChatMessage(data.reply, 'assistant');
            } catch (err) {
                console.error("Chat error:", err);
                appendChatMessage("Error communicating with AI Copilot.", 'system');
            }

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    function appendChatMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;

        // Simple Markdown parsing for **bold** text in assistant replies
        if (sender === 'assistant') {
            msgDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } else {
            msgDiv.textContent = text;
        }

        chatMessages.appendChild(msgDiv);
    }

    // Trade History filters
    const historySearch = document.getElementById('history-search-symbol');
    const historyFilter = document.getElementById('history-filter-type');
    if (historySearch) {
        historySearch.addEventListener('input', renderHistory);
    }
    if (historyFilter) {
        historyFilter.addEventListener('change', renderHistory);
    }

    // Init
    showAuth();
});
