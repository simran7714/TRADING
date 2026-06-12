document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = null;
    let equityChartInstance = null;
    let pnlChartInstance = null;
    let tvChartInstance = null;
    let currentTrades = [];

    // --- Theme Switching Support ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('.theme-icon') : null;

    function getAutoTheme() {
        const hour = new Date().getHours();
        const isNightTime = hour < 6 || hour >= 18; // 6 PM to 6 AM is dark
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return isNightTime ? 'dark' : 'light';
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            if (themeIcon) themeIcon.textContent = '🌙';
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            if (themeIcon) themeIcon.textContent = '☀️';
        }
        
        // Update lightweight charts dynamically if initialized
        if (tvChartInstance) {
            tvChartInstance.applyOptions({
                layout: {
                    background: { type: 'solid', color: theme === 'light' ? '#ffffff' : '#1a1d2d' },
                    textColor: theme === 'light' ? '#475569' : '#94a3b8'
                },
                grid: {
                    vertLines: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
                    horzLines: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
                },
                timeScale: {
                    borderColor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                }
            });
        }
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(getAutoTheme());
    }

    // Dynamic accent color cycle (Indigo -> Purple -> Teal -> Rose)
    const accentColors = [
        { primary: '#6366f1', hover: '#4f46e5' },
        { primary: '#a855f7', hover: '#9333ea' },
        { primary: '#10b981', hover: '#059669' },
        { primary: '#f43f5e', hover: '#e11d48' }
    ];
    let accentIndex = 0;
    
    function startAccentCycle() {
        setInterval(() => {
            accentIndex = (accentIndex + 1) % accentColors.length;
            const color = accentColors[accentIndex];
            document.documentElement.style.setProperty('--accent', color.primary);
            document.documentElement.style.setProperty('--accent-hover', color.hover);
        }, 4000);
    }
    
    startAccentCycle();

    // Auto theme cycling (changes theme every 8 seconds until user manual interaction)
    let autoCycleInterval = null;
    
    function startAutoThemeCycle() {
        if (sessionStorage.getItem('user_interacted_theme')) return;
        autoCycleInterval = setInterval(() => {
            if (!sessionStorage.getItem('user_interacted_theme')) {
                const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                setTheme(newTheme);
            } else {
                stopAutoThemeCycle();
            }
        }, 8000);
    }
    
    function stopAutoThemeCycle() {
        if (autoCycleInterval) {
            clearInterval(autoCycleInterval);
            autoCycleInterval = null;
        }
    }

    // Start cycling if no interaction recorded yet
    startAutoThemeCycle();

    // Event listener for manual theme toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            sessionStorage.setItem('user_interacted_theme', 'true');
            stopAutoThemeCycle();
            const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            setTheme(newTheme);
        });
    }

    // Stop auto theme cycle on any user input or clicks on form
    document.addEventListener('click', (e) => {
        // If clicked on input fields, buttons, or links, stop the auto cycle
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'A') {
            sessionStorage.setItem('user_interacted_theme', 'true');
            stopAutoThemeCycle();
        }
    });

    document.addEventListener('keydown', () => {
        sessionStorage.setItem('user_interacted_theme', 'true');
        stopAutoThemeCycle();
    });

    // Listen for system theme preferences change dynamically
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // --- DOM Elements ---
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    const authForm = document.getElementById('auth-form');
    const authError = document.getElementById('auth-error');
    const toggleAuthLink = document.getElementById('toggle-auth');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    // Ensure auth-error is always visible when content is set
    if (authError) authError.style.display = 'block';
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
    const profileBankNameInput = document.getElementById('profile-bank-name');
    const profileBankAccInput = document.getElementById('profile-bank-acc');

    const phoneCountrySelect = document.getElementById('phone-country-code');
    const phoneValidationMsg = document.getElementById('phone-validation-msg');
    const profilePhoneCountrySelect = document.getElementById('profile-phone-country-code');
    const profilePhoneValidationMsg = document.getElementById('profile-phone-validation-msg');

    // Dashboard Metrics
    const metricPnl = document.getElementById('metric-pnl');
    const metricWinrate = document.getElementById('metric-winrate');
    const metricTrades = document.getElementById('metric-trades');
    const tradesTbody = document.getElementById('trades-tbody');
    const aiInsightsContent = document.getElementById('ai-insights-content');

    let isLoginMode = true;

    // --- Authentication ---
    if (toggleAuthLink) toggleAuthLink.addEventListener('click', (e) => {
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
            
            // Auto-detect location & select country code on register view
            detectAndSelectRegisterCountry();
        }
        // Re-attach event listener
        const newToggle = document.getElementById('toggle-auth');
        if (newToggle) newToggle.addEventListener('click', arguments.callee);
    });

    if (authForm) authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authError) { authError.textContent = ''; authError.style.display = 'none'; }
        const username = usernameInput.value;
        const password = passwordInput.value;
        
        const phoneVal = document.getElementById('phone').value.trim();
        const phoneCountry = phoneCountrySelect ? phoneCountrySelect.value : '+1';
        const fullPhone = phoneVal ? `${phoneCountry} ${phoneVal}` : '';

        if (!isLoginMode && validateRegisterPhone && !validateRegisterPhone()) {
            document.getElementById('phone').focus();
            authError.textContent = 'Please enter a valid phone number for your selected country.';
            authError.style.color = 'var(--danger)';
            return;
        }

        const email = document.getElementById('email').value;
        const broker = document.getElementById('broker').value;
        const balance = document.getElementById('balance').value;
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

        const bodyData = { username, password };
        if (!isLoginMode) {
            bodyData.phone_number = fullPhone;
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
                    if (authSubmitBtn) authSubmitBtn.textContent = 'Sign In';
                    if (authError) {
                        authError.textContent = 'Registration successful. Please sign in.';
                        authError.style.color = 'var(--success)';
                        authError.className = 'auth-msg-box success';
                        authError.style.display = 'block';
                    }
                    if (typeof switchAuthTab === 'function') switchAuthTab('login');
                } else {
                    // Login success
                    checkSession();
                }
            } else {
                if (authError) {
                    authError.textContent = data.error || 'Authentication failed';
                    authError.className = 'auth-msg-box error';
                    authError.style.display = 'block';
                }
            }
        } catch (err) {
            if (authError) {
                authError.textContent = 'Network error. Please try again.';
                authError.className = 'auth-msg-box error';
                authError.style.display = 'block';
            }
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

    const bankPortals = {
        "HDFC Bank": "https://netbanking.hdfcbank.com",
        "State Bank of India": "https://www.onlinesbi.sbi",
        "ICICI Bank": "https://www.icicibank.com",
        "Axis Bank": "https://www.axisbank.com",
        "Chase Bank": "https://www.chase.com",
        "Bank of America": "https://www.bankofamerica.com",
        "Wells Fargo": "https://www.wellsfargo.com",
        "CitiBank": "https://www.citibank.com",
        "Barclays": "https://www.barclays.co.uk",
        "HSBC": "https://www.hsbc.co.uk",
        "Lloyds Bank": "https://www.lloydsbank.com",
        "NatWest": "https://www.natwest.com",
        "Deutsche Bank": "https://www.deutsche-bank.de",
        "Commerzbank": "https://www.commerzbank.de",
        "N26": "https://n26.com",
        "Sparkasse": "https://www.sparkasse.de",
        "MUFG Bank": "https://www.bk.mufg.jp",
        "Mizuho Bank": "https://www.mizuhobank.co.jp",
        "Sumitomo Mitsui Bank": "https://www.smbc.co.jp",
        "Japan Post Bank": "https://www.jp-bank.japanpost.jp",
        "Commonwealth Bank": "https://www.commbank.com.au",
        "Westpac": "https://www.westpac.com.au",
        "ANZ": "https://www.anz.com.au",
        "NAB": "https://www.nab.com.au",
        "Industrial and Commercial Bank of China": "http://www.icbc.com.cn",
        "China Construction Bank": "http://www.ccb.com",
        "Agricultural Bank of China": "http://www.abchina.com",
        "Bank of China": "http://www.boc.cn"
    };

    const countryBanks = {
        "india": ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank"],
        "usa": ["Chase Bank", "Bank of America", "Wells Fargo", "CitiBank"],
        "uk": ["Barclays", "HSBC", "Lloyds Bank", "NatWest"],
        "germany": ["Deutsche Bank", "Commerzbank", "N26", "Sparkasse"],
        "japan": ["MUFG Bank", "Mizuho Bank", "Sumitomo Mitsui Bank", "Japan Post Bank"],
        "australia": ["Commonwealth Bank", "Westpac", "ANZ", "NAB"],
        "china": ["Industrial and Commercial Bank of China", "China Construction Bank", "Agricultural Bank of China", "Bank of China"]
    };

    const countryDialCodes = {
        "india": "+91",
        "usa": "+1",
        "uk": "+44",
        "germany": "+49",
        "japan": "+81",
        "australia": "+61",
        "china": "+86",
        "default": "+1"
    };

    const supportNumbers = {
        "india": "Support helpline: +91 1800 266 0199",
        "usa": "Support helpline: +1 800 555 0199",
        "uk": "Support helpline: +44 808 196 0199",
        "germany": "Support helpline: +49 800 180 0199",
        "japan": "Support helpline: +81 120 939 199",
        "australia": "Support helpline: +61 1800 861 199",
        "china": "Support helpline: +86 400 820 0199",
        "default": "Support helpline: +1 800 555 0199"
    };

    function updateBankDatalist(locationStr) {
        const banksListDatalist = document.getElementById('banks-list');
        if (!banksListDatalist) return;
        
        banksListDatalist.innerHTML = '';
        
        const loc = (locationStr || '').toLowerCase();
        let selectedBanks = [];
        
        if (loc.includes('india') || loc.includes('mumbai')) {
            selectedBanks = countryBanks['india'];
        } else if (loc.includes('usa') || loc.includes('new york') || loc.includes('united states') || loc.includes('america')) {
            selectedBanks = countryBanks['usa'];
        } else if (loc.includes('uk') || loc.includes('london') || loc.includes('united kingdom') || loc.includes('england')) {
            selectedBanks = countryBanks['uk'];
        } else if (loc.includes('germany') || loc.includes('berlin')) {
            selectedBanks = countryBanks['germany'];
        } else if (loc.includes('japan') || loc.includes('tokyo')) {
            selectedBanks = countryBanks['japan'];
        } else if (loc.includes('australia') || loc.includes('sydney')) {
            selectedBanks = countryBanks['australia'];
        } else if (loc.includes('china') || loc.includes('shanghai')) {
            selectedBanks = countryBanks['china'];
        } else {
            selectedBanks = ["Chase Bank", "HDFC Bank", "HSBC", "Wells Fargo", "Barclays", "Deutsche Bank"];
        }
        
        selectedBanks.forEach(bank => {
            const option = document.createElement('option');
            option.value = bank;
            banksListDatalist.appendChild(option);
        });
    }

    function updateSupportHelpline(locationStr) {
        const supportEl = document.getElementById('support-phone-display');
        if (!supportEl) return;
        
        const loc = (locationStr || '').toLowerCase();
        let helpline = supportNumbers["default"];
        
        if (loc.includes('india') || loc.includes('mumbai')) helpline = supportNumbers["india"];
        else if (loc.includes('usa') || loc.includes('new york') || loc.includes('united states') || loc.includes('america')) helpline = supportNumbers["usa"];
        else if (loc.includes('uk') || loc.includes('london') || loc.includes('united kingdom') || loc.includes('england')) helpline = supportNumbers["uk"];
        else if (loc.includes('germany') || loc.includes('berlin')) helpline = supportNumbers["germany"];
        else if (loc.includes('japan') || loc.includes('tokyo')) helpline = supportNumbers["japan"];
        else if (loc.includes('australia') || loc.includes('sydney')) helpline = supportNumbers["australia"];
        else if (loc.includes('china') || loc.includes('shanghai')) helpline = supportNumbers["china"];
        
        supportEl.textContent = helpline;
    }

    function updatePhoneDialCode(locationStr) {
        if (!profilePhoneCountrySelect) return;
        const loc = (locationStr || '').toLowerCase();
        let code = '';
        if (loc.includes('india') || loc.includes('mumbai')) code = '+91';
        else if (loc.includes('usa') || loc.includes('new york') || loc.includes('united states') || loc.includes('america')) code = '+1';
        else if (loc.includes('uk') || loc.includes('london') || loc.includes('united kingdom') || loc.includes('england')) code = '+44';
        else if (loc.includes('germany') || loc.includes('berlin')) code = '+49';
        else if (loc.includes('japan') || loc.includes('tokyo')) code = '+81';
        else if (loc.includes('australia') || loc.includes('sydney')) code = '+61';
        else if (loc.includes('china') || loc.includes('shanghai')) code = '+86';
        
        if (code) {
            profilePhoneCountrySelect.value = code;
            profilePhoneInput.dispatchEvent(new Event('input'));
        }
    }

    if (profileLocationInput) {
        profileLocationInput.addEventListener('input', (e) => {
            const val = e.target.value;
            updateBankDatalist(val);
            updateSupportHelpline(val);
            updatePhoneDialCode(val);
        });
    }

    async function autoDetectLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                if (data && data.city && data.country_name) {
                    return `${data.city}, ${data.country_name}`;
                }
            }
        } catch (e) {
            console.error("IP Geolocation failed, using timezone backup:", e);
        }
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) {
                const parts = tz.split('/');
                if (parts.length > 1) {
                    const city = parts[1].replace('_', ' ');
                    return city;
                }
            }
        } catch (e) {
            console.error("Timezone backup failed:", e);
        }
        return null;
    }

    const autoDetectBtn = document.getElementById('auto-detect-location-btn');
    if (autoDetectBtn) {
        autoDetectBtn.addEventListener('click', async () => {
            const originalText = autoDetectBtn.innerHTML;
            autoDetectBtn.innerHTML = '⏳ Detecting...';
            autoDetectBtn.disabled = true;
            
            const loc = await autoDetectLocation();
            
            autoDetectBtn.innerHTML = originalText;
            autoDetectBtn.disabled = false;
            
            if (loc && profileLocationInput) {
                profileLocationInput.value = loc;
                profileLocationInput.dispatchEvent(new Event('input'));
            } else {
                alert('Could not auto-detect location. Please enter it manually.');
            }
        });
    }

    function maskBankAccount(accNo) {
        if (!accNo) return '•••• ••••';
        const str = String(accNo).trim();
        if (str.length <= 4) return '•••• ' + str;
        return '•••• ' + str.substring(str.length - 4);
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
            updateSupportHelpline(userDetails.location || '');

            const loginDate = new Date();
            const formattedLogin = loginDate.getFullYear() + '-' +
                String(loginDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(loginDate.getDate()).padStart(2, '0') + ' ' +
                String(loginDate.getHours()).padStart(2, '0') + ':' +
                String(loginDate.getMinutes()).padStart(2, '0');
            document.getElementById('user-date-display').textContent = `Logged In: ${formattedLogin}`;

            // Render Premium Bank Account Card
            const bankCardContainer = document.getElementById('user-bank-card-container');
            if (bankCardContainer) {
                if (userDetails.bank_name && userDetails.bank_account_no) {
                    const portalUrl = bankPortals[userDetails.bank_name] || '#';
                    const portalBtn = portalUrl !== '#'
                        ? `<a href="${portalUrl}" target="_blank" class="bank-portal-link" id="bank-portal-link-btn">Visit Portal ↗</a>`
                        : '';

                    bankCardContainer.innerHTML = `
                        <div class="sidebar-bank-card" id="sidebar-bank-card-el" title="Click to manage bank account">
                            <div class="bank-card-header">
                                <div class="bank-card-header-left">
                                    <span class="bank-card-label">Linked Bank Account</span>
                                    <span class="bank-card-name">${userDetails.bank_name}</span>
                                </div>
                                <span class="bank-card-badge">✓ Linked</span>
                            </div>
                            <div class="bank-card-chip-row">
                                <div class="bank-card-chip"></div>
                                <div class="bank-card-chip-lines">
                                    <div class="bank-card-chip-line"></div>
                                    <div class="bank-card-chip-line"></div>
                                    <div class="bank-card-chip-line"></div>
                                </div>
                            </div>
                            <div class="bank-card-number">${maskBankAccount(userDetails.bank_account_no)}</div>
                            <div class="bank-card-footer">
                                <div class="bank-card-holder-col">
                                    <span class="bank-card-holder-label">Account Holder</span>
                                    <span class="bank-card-holder">${currentUser}</span>
                                </div>
                                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;">
                                    <div class="bank-card-network">
                                        <div class="bank-card-network-circle"></div>
                                        <div class="bank-card-network-circle"></div>
                                    </div>
                                    ${portalBtn}
                                </div>
                            </div>
                        </div>
                    `;
                    const cardEl = document.getElementById('sidebar-bank-card-el');
                    if (cardEl) {
                        cardEl.addEventListener('click', (e) => {
                            if (e.target.closest('.bank-portal-link')) return;
                            editProfileBtn.click();
                            setTimeout(() => { if (profileBankNameInput) profileBankNameInput.focus(); }, 100);
                        });
                    }
                    const portalLinkEl = document.getElementById('bank-portal-link-btn');
                    if (portalLinkEl) {
                        portalLinkEl.addEventListener('click', (e) => { e.stopPropagation(); });
                    }
                } else {
                    bankCardContainer.innerHTML = `
                        <button class="bank-link-btn" id="bank-link-btn-el">
                            <span>🔗</span> Link Bank Account
                        </button>
                    `;
                    const linkEl = document.getElementById('bank-link-btn-el');
                    if (linkEl) {
                        linkEl.addEventListener('click', () => {
                            editProfileBtn.click();
                            setTimeout(() => { if (profileBankNameInput) profileBankNameInput.focus(); }, 100);
                        });
                    }
                }
            }
        }

        // Render Fund Allocation Slider
        renderFundSlider();

        // Initialize responsive sidebar vertical slider
        initSidebarSlider();

        // Auto-switch to Bank panel if bank is already linked, otherwise show Profile panel
        if (userDetails && userDetails.bank_name && userDetails.bank_account_no) {
            switchSidebarSlide(1);
        } else {
            switchSidebarSlide(0);
        }

        if (!isSearchResult) {
            loadDashboardData();
        }
    }

    // --- Responsive Sidebar Vertical Slider (Up/Down) ---
    function initSidebarSlider() {
        const tabs = document.querySelectorAll('.sidebar-slider-tab');
        const track = document.getElementById('sidebar-slider-track');
        if (!tabs.length || !track) return;

        tabs.forEach(tab => {
            if (tab.dataset.listenerAdded) return;
            tab.dataset.listenerAdded = 'true';

            tab.addEventListener('click', () => {
                const slideIdx = parseInt(tab.dataset.slide);
                switchSidebarSlide(slideIdx);
            });
        });
    }

    function switchSidebarSlide(index) {
        const track = document.getElementById('sidebar-slider-track');
        const tabs = document.querySelectorAll('.sidebar-slider-tab');
        if (!track) return;

        const offset = index * 275;
        track.style.transform = `translateY(-${offset}px)`;

        tabs.forEach(t => {
            t.classList.toggle('active', parseInt(t.dataset.slide) === index);
        });
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
    if (newTradeBtn) {
        newTradeBtn.addEventListener('click', () => {
            tradeModal.classList.add('active');
            document.getElementById('trade-modal-title').textContent = 'Log Trade';
            document.getElementById('trade-id').value = '';
            tradeForm.reset();
            document.getElementById('trade-entry-date').valueAsDate = new Date();
        });
    }

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
            
            const parsedPhone = parsePhoneNumber(userDetails.phone_number);
            if (profilePhoneCountrySelect) {
                profilePhoneCountrySelect.value = parsedPhone.countryCode;
            }
            profilePhoneInput.value = parsedPhone.number;
            
            profileEmailInput.value = userDetails.email || '';
            profileBrokerInput.value = userDetails.broker_name || '';
            profileJoinedDateInput.value = new Date().toISOString().split('T')[0];
            if (profileLocationInput) {
                profileLocationInput.value = userDetails.location || '';
                updateBankDatalist(userDetails.location || '');
                if (!userDetails.location && autoDetectBtn) {
                    autoDetectBtn.click();
                }
            }
            if (profileBalanceInput) {
                profileBalanceInput.value = userDetails.balance !== undefined ? userDetails.balance : 10000.0;
            }
            if (profileBankNameInput) {
                profileBankNameInput.value = userDetails.bank_name || '';
            }
            if (profileBankAccInput) {
                profileBankAccInput.value = userDetails.bank_account_no || '';
            }

        if (validateProfilePhone) {
            validateProfilePhone();
        }
        }
        profileModal.classList.add('active');
        // Always open to Edit Profile tab
        switchProfileTab('edit-profile-tab');
        // Inject linked bank preview at top of form
        renderProfileLinkedBank();
    });

    // --- Profile Modal Tab Switching ---
    function switchProfileTab(tabId) {
        document.querySelectorAll('.profile-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.profile-tab-content').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabId);
        });
        if (tabId === 'withdraw-tab') {
            populateWithdrawTab();
        }
    }

    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab));
    });

    // --- Linked Bank Preview in Edit Profile Tab ---
    function renderProfileLinkedBank() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        // Remove existing preview if any
        const existing = document.getElementById('profile-linked-bank-preview');
        if (existing) existing.remove();

        const hasBank = userDetails && userDetails.bank_name && userDetails.bank_account_no;
        const masked = hasBank ? ('•••• •••• •••• ' + String(userDetails.bank_account_no).slice(-4)) : null;

        const preview = document.createElement('div');
        preview.id = 'profile-linked-bank-preview';
        preview.className = 'profile-linked-bank';

        if (hasBank) {
            preview.innerHTML = `
                <div class="profile-linked-bank-icon">🏛️</div>
                <div class="profile-linked-bank-info">
                    <div class="profile-linked-bank-title">Linked Bank Account</div>
                    <div class="profile-linked-bank-name">${userDetails.bank_name}</div>
                    <div class="profile-linked-bank-acc">${masked}</div>
                </div>
                <div class="profile-linked-bank-status">
                    <span class="profile-linked-bank-badge linked">✓ Linked</span>
                    <button type="button" class="profile-linked-bank-change" id="profile-bank-change-btn">Change</button>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div class="profile-linked-bank-icon">🔗</div>
                <div class="profile-linked-bank-info">
                    <div class="profile-linked-bank-title">Bank Account</div>
                    <div class="profile-linked-bank-name" style="color: #f87171;">Not Linked</div>
                    <div class="profile-linked-bank-acc" style="color: var(--text-secondary);">Add your bank details below</div>
                </div>
                <div class="profile-linked-bank-status">
                    <span class="profile-linked-bank-badge unlinked">⚠ Unlinked</span>
                    <button type="button" class="profile-linked-bank-change" id="profile-bank-change-btn">Link Now</button>
                </div>
            `;
        }

        // Insert at top of form
        form.insertBefore(preview, form.firstChild);

        // Change / Link Now button scrolls to bank name field
        const changeBtn = document.getElementById('profile-bank-change-btn');
        if (changeBtn && profileBankNameInput) {
            changeBtn.addEventListener('click', () => {
                profileBankNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                profileBankNameInput.focus();
            });
        }
    }

    // --- Withdraw Tab Logic ---
    function maskBankAccWithdraw(accNo) {
        if (!accNo) return '•••• ••••';
        const s = String(accNo).trim();
        return '•••• ' + s.slice(-4);
    }

    function populateWithdrawTab() {
        const bal = parseFloat(userDetails && userDetails.balance) || 0;

        // Balance display
        const balEl = document.getElementById('withdraw-current-balance');
        if (balEl) balEl.textContent = fmtCurrency(bal);

        // Destination bank
        const nameEl = document.getElementById('withdraw-dest-bank-name');
        const accEl  = document.getElementById('withdraw-dest-bank-acc');
        const badge  = document.getElementById('withdraw-linked-badge');
        const hasBank = userDetails && userDetails.bank_name && userDetails.bank_account_no;

        if (nameEl) nameEl.textContent = hasBank ? userDetails.bank_name : 'No bank linked';
        if (accEl)  accEl.textContent  = hasBank ? maskBankAccWithdraw(userDetails.bank_account_no) : 'Link a bank account first';
        if (badge) {
            badge.textContent = hasBank ? 'LINKED' : 'NONE';
            badge.className = 'withdraw-bank-dest-badge' + (hasBank ? '' : ' unlinked');
        }

        // Slider setup
        const slider    = document.getElementById('withdraw-slider');
        const amtInput  = document.getElementById('withdraw-amount-input');
        const maxLabel  = document.getElementById('withdraw-slider-max-label');
        const confirmBtn= document.getElementById('withdraw-confirm-btn');

        if (slider) {
            slider.max   = bal;
            slider.value = 0;
        }
        if (maxLabel) maxLabel.textContent = fmtCurrency(bal);
        if (amtInput) amtInput.value = '';
        if (confirmBtn) confirmBtn.disabled = true;

        // Update fill and summary
        updateWithdrawUI(0, bal);

        // Quick chips
        document.querySelectorAll('.withdraw-chip').forEach(chip => {
            chip.classList.remove('active');
            chip.onclick = () => {
                const pct = parseFloat(chip.dataset.pct);
                const val = Math.floor(bal * pct / 100) * 100;
                if (amtInput) { amtInput.value = val; amtInput.dispatchEvent(new Event('input')); }
                if (slider)   { slider.value = val;   slider.dispatchEvent(new Event('input')); }
                document.querySelectorAll('.withdraw-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            };
        });

        // Sync input → slider
        if (amtInput) {
            amtInput.oninput = () => {
                let val = parseFloat(amtInput.value) || 0;
                val = Math.min(val, bal);
                if (slider) slider.value = val;
                updateWithdrawUI(val, bal);
                document.querySelectorAll('.withdraw-chip').forEach(c => c.classList.remove('active'));
            };
        }

        // Sync slider → input
        if (slider) {
            slider.oninput = () => {
                const val = parseFloat(slider.value) || 0;
                if (amtInput) amtInput.value = val || '';
                updateWithdrawUI(val, bal);
                document.querySelectorAll('.withdraw-chip').forEach(c => c.classList.remove('active'));
            };
        }

        // Confirm button
        if (confirmBtn) {
            confirmBtn.onclick = () => handleWithdrawConfirm(bal);
        }
    }

    function updateWithdrawUI(amount, balance) {
        const slider    = document.getElementById('withdraw-slider');
        const confirmBtn= document.getElementById('withdraw-confirm-btn');
        const sumAmt    = document.getElementById('withdraw-summary-amount');
        const sumRem    = document.getElementById('withdraw-summary-remaining');

        const pct = balance > 0 ? (amount / balance * 100) : 0;
        if (slider) {
            slider.style.background = `linear-gradient(to right, #a855f7 ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
        }
        if (sumAmt) sumAmt.textContent = fmtCurrency(amount);
        if (sumRem) sumRem.textContent = fmtCurrency(Math.max(0, balance - amount));
        if (confirmBtn) confirmBtn.disabled = amount <= 0 || amount > balance || !userDetails?.bank_name;
    }

    async function handleWithdrawConfirm(currentBalance) {
        const amtInput  = document.getElementById('withdraw-amount-input');
        const confirmBtn= document.getElementById('withdraw-confirm-btn');
        const amount    = parseFloat(amtInput ? amtInput.value : 0) || 0;

        if (amount <= 0 || amount > currentBalance) {
            showTransferToast('⚠️ Invalid withdrawal amount.');
            return;
        }
        if (!userDetails || !userDetails.bank_name) {
            showTransferToast('⚠️ Please link a bank account first.');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Processing...';

        const newBal = currentBalance - amount;

        try {
            const resp = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    custom_user_id: userDetails.custom_user_id,
                    phone_number:   userDetails.phone_number,
                    email:          userDetails.email,
                    broker_name:    userDetails.broker_name,
                    created_at:     userDetails.created_at,
                    location:       userDetails.location,
                    balance:        newBal,
                    bank_name:      userDetails.bank_name,
                    bank_account_no:userDetails.bank_account_no
                })
            });

            if (resp.ok) {
                // Credit simulated bank balance
                setSimBankBalance(getSimBankBalance() + amount);
                userDetails.balance = newBal;

                // Update balance metric card with pulse
                const balanceEl = document.getElementById('metric-balance');
                if (balanceEl) {
                    balanceEl.textContent = fmtCurrency(newBal);
                    const card = balanceEl.closest('.metric-card');
                    if (card) {
                        card.classList.add('balance-pulse');
                        setTimeout(() => card.classList.remove('balance-pulse'), 700);
                    }
                }

                showTransferToast(`✅ ${fmtCurrency(amount)} withdrawn to ${userDetails.bank_name}!`);

                // Re-render sidebar slider and close modal
                renderFundSlider();
                profileModal.classList.remove('active');

            } else {
                const err = await resp.json().catch(() => ({}));
                showTransferToast('❌ Withdrawal failed: ' + (err.error || 'Unknown error'));
                confirmBtn.disabled = false;
                confirmBtn.textContent = '💸 Confirm Withdrawal';
            }
        } catch {
            showTransferToast('❌ Network error. Please try again.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = '💸 Confirm Withdrawal';
        }
    }


    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (validateProfilePhone && !validateProfilePhone()) {
            profilePhoneInput.focus();
            return;
        }

        const phoneVal = profilePhoneInput.value.trim();
        const phoneCountry = profilePhoneCountrySelect ? profilePhoneCountrySelect.value : '+1';
        const fullPhone = phoneVal ? `${phoneCountry} ${phoneVal}` : '';

        const profileData = {
            custom_user_id: profileUserIdInput.value,
            phone_number: fullPhone,
            email: profileEmailInput.value,
            broker_name: profileBrokerInput.value,
            created_at: profileJoinedDateInput.value,
            location: profileLocationInput ? profileLocationInput.value : '',
            balance: profileBalanceInput ? parseFloat(profileBalanceInput.value) : 10000.0,
            bank_name: profileBankNameInput ? profileBankNameInput.value : '',
            bank_account_no: profileBankAccInput ? profileBankAccInput.value : ''
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

        // Update Performance Status Bar inside Trade History Page
        const histPerfBadge = document.getElementById('history-performance-badge');
        const histPerfDesc = document.getElementById('history-performance-desc');
        if (histPerfBadge && histPerfDesc) {
            let label = 'No Data';
            let desc = 'Log closed trades to evaluate';
            let bg = 'rgba(148, 163, 184, 0.1)';
            let color = '#94a3b8';
            let borderColor = 'rgba(148, 163, 184, 0.2)';

            if (totalTradesCount > 0) {
                if (winRate >= 60 && totalRealizedPnl > 0) {
                    label = 'Excellent';
                    desc = 'Highly profitable trading setup';
                    bg = 'rgba(16, 185, 129, 0.1)';
                    color = '#10b981';
                    borderColor = 'rgba(16, 185, 129, 0.2)';
                } else if (winRate >= 50 || totalRealizedPnl > 0) {
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

            histPerfBadge.textContent = label;
            histPerfBadge.style.background = bg;
            histPerfBadge.style.color = color;
            histPerfBadge.style.borderColor = borderColor;
            histPerfDesc.textContent = desc;
        }

        const histPerfWinrate = document.getElementById('history-perf-winrate');
        const histPerfLosrate = document.getElementById('history-perf-losrate');
        const histPerfHoldtime = document.getElementById('history-perf-holdtime');

        if (histPerfWinrate) {
            histPerfWinrate.textContent = `Win Rate: ${winRate.toFixed(1)}%`;
            const newWinLink = histPerfWinrate.cloneNode(true);
            histPerfWinrate.parentNode.replaceChild(newWinLink, histPerfWinrate);
            newWinLink.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`Win Rate: ${winRate.toFixed(1)}%`);
            });
        }
        if (histPerfLosrate) {
            histPerfLosrate.textContent = `Loss Rate: ${lossRate.toFixed(1)}%`;
            const newLossLink = histPerfLosrate.cloneNode(true);
            histPerfLosrate.parentNode.replaceChild(newLossLink, histPerfLosrate);
            newLossLink.addEventListener('click', (e) => {
                e.preventDefault();
                alert(`Loss Rate: ${lossRate.toFixed(1)}%`);
            });
        }
        if (histPerfHoldtime) {
            histPerfHoldtime.textContent = `Time: ${holdCount > 0 ? (totalHoldDays / holdCount).toFixed(1) + 'd' : '-'}`;
            const newHoldLink = histPerfHoldtime.cloneNode(true);
            histPerfHoldtime.parentNode.replaceChild(newHoldLink, histPerfHoldtime);
            newHoldLink.addEventListener('click', (e) => {
                e.preventDefault();
                const avgTotal = holdCount > 0 ? `${(totalHoldDays / holdCount).toFixed(1)} days` : 'N/A';
                const avgWin = winHoldCount > 0 ? `${(winHoldDays / winHoldCount).toFixed(1)} days` : 'N/A';
                const avgLoss = lossHoldCount > 0 ? `${(lossHoldDays / lossHoldCount).toFixed(1)} days` : 'N/A';
                alert(`Average Holding Time:\n• Overall: ${avgTotal}\n• Winning Trades: ${avgWin}\n• Losing Trades: ${avgLoss}`);
            });
        }

        // History link — scrolls to the trade table
        const histPerfHistoryLink = document.getElementById('history-perf-history');
        if (histPerfHistoryLink) {
            const newHistLink = histPerfHistoryLink.cloneNode(true);
            histPerfHistoryLink.parentNode.replaceChild(newHistLink, histPerfHistoryLink);
            newHistLink.addEventListener('click', (e) => {
                e.preventDefault();
                const table = document.getElementById('history-tbody');
                if (table) {
                    table.closest('table').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
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
        const isLightTheme = document.documentElement.classList.contains('light');
        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { type: 'solid', color: isLightTheme ? '#ffffff' : '#1a1d2d' },
                textColor: isLightTheme ? '#475569' : '#94a3b8',
            },
            grid: {
                vertLines: { color: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            timeScale: {
                borderColor: isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
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
    // --- Fund Allocation Slider ---
    const BANK_SIM_BALANCE_KEY = 'tl_sim_bank_balance';
    const MAX_TRANSFER = 100000;

    function getSimBankBalance() {
        const stored = localStorage.getItem(BANK_SIM_BALANCE_KEY);
        return stored !== null ? parseFloat(stored) : 250000;
    }

    function setSimBankBalance(val) {
        localStorage.setItem(BANK_SIM_BALANCE_KEY, String(Math.max(0, val)));
    }

    function fmtCurrency(val) {
        return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function showTransferToast(msg) {
        let toast = document.getElementById('transfer-toast-el');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'transfer-toast-el';
            toast.className = 'transfer-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }

    function renderFundSlider() {
        const container = document.getElementById('sidebar-slider-container');
        if (!container) return;

        // Only show slider if user has a linked bank
        if (!userDetails || !userDetails.bank_name || !userDetails.bank_account_no) {
            container.innerHTML = '';
            return;
        }

        const simBal = getSimBankBalance();
        const sliderMax = Math.min(MAX_TRANSFER, simBal);
        const initVal = Math.round(sliderMax * 0.3);

        container.innerHTML = `
            <div class="fund-slider-card" id="fund-slider-card-el">
                <div class="fund-slider-header">
                    <span class="fund-slider-title">⚡ Fund Transfer</span>
                    <span class="fund-slider-bank-bal" id="slider-bank-bal-display">${fmtCurrency(simBal)} avail.</span>
                </div>
                <div class="fund-slider-amount" id="slider-amount-display">${fmtCurrency(initVal)}</div>
                <input
                    type="range"
                    id="fund-alloc-slider"
                    class="fund-slider-range"
                    min="0"
                    max="${sliderMax}"
                    step="500"
                    value="${initVal}"
                    style="--slider-fill: ${sliderMax > 0 ? (initVal / sliderMax * 100) : 0}%"
                />
                <div class="fund-slider-minmax">
                    <span>₹0</span>
                    <span>${fmtCurrency(sliderMax)}</span>
                </div>
                <button class="fund-transfer-btn" id="fund-transfer-btn" ${sliderMax === 0 ? 'disabled' : ''}>
                    ⚡ Quick Transfer to Trading A/C
                </button>
            </div>
        `;

        // Update range fill track gradient dynamically
        const slider = document.getElementById('fund-alloc-slider');
        const amountDisplay = document.getElementById('slider-amount-display');
        const transferBtn = document.getElementById('fund-transfer-btn');

        function updateSliderFill() {
            if (!slider) return;
            const pct = sliderMax > 0 ? (parseFloat(slider.value) / sliderMax * 100) : 0;
            slider.style.background = `linear-gradient(to right, #6366f1 ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
        }

        updateSliderFill();

        if (slider) {
            slider.addEventListener('input', () => {
                const val = parseFloat(slider.value);
                if (amountDisplay) amountDisplay.textContent = fmtCurrency(val);
                updateSliderFill();
                if (transferBtn) transferBtn.disabled = val <= 0;
            });
        }

        if (transferBtn) {
            transferBtn.addEventListener('click', async () => {
                const transferAmt = parseFloat(slider ? slider.value : 0);
                if (transferAmt <= 0 || transferAmt > getSimBankBalance()) {
                    showTransferToast('⚠️ Invalid transfer amount.');
                    return;
                }

                transferBtn.disabled = true;
                transferBtn.textContent = '⏳ Transferring...';

                const newBal = (parseFloat(userDetails.balance) || 0) + transferAmt;

                try {
                    const resp = await fetch('/api/auth/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            custom_user_id: userDetails.custom_user_id,
                            phone_number: userDetails.phone_number,
                            email: userDetails.email,
                            broker_name: userDetails.broker_name,
                            created_at: userDetails.created_at,
                            location: userDetails.location,
                            balance: newBal,
                            bank_name: userDetails.bank_name,
                            bank_account_no: userDetails.bank_account_no
                        })
                    });

                    if (resp.ok) {
                        // Deduct from simulated bank balance
                        setSimBankBalance(getSimBankBalance() - transferAmt);
                        userDetails.balance = newBal;

                        // Update balance metric card with pulse effect
                        const balanceEl = document.getElementById('metric-balance');
                        if (balanceEl) {
                            balanceEl.textContent = fmtCurrency(newBal);
                            balanceEl.closest('.metric-card').classList.add('balance-pulse');
                            setTimeout(() => balanceEl.closest('.metric-card').classList.remove('balance-pulse'), 700);
                        }

                        showTransferToast(`✅ ${fmtCurrency(transferAmt)} transferred to your trading account!`);

                        // Re-render slider with updated bank balance
                        renderFundSlider();
                    } else {
                        const err = await resp.json();
                        showTransferToast('❌ Transfer failed: ' + (err.error || 'Unknown error'));
                        transferBtn.disabled = false;
                        transferBtn.textContent = '⚡ Quick Transfer to Trading A/C';
                    }
                } catch (e) {
                    showTransferToast('❌ Network error. Please try again.');
                    transferBtn.disabled = false;
                    transferBtn.textContent = '⚡ Quick Transfer to Trading A/C';
                }
            });
        }
    }

    // --- Geolocation & Phone Validation Helpers ---
    let detectedRegionData = null;

    function parsePhoneNumber(phoneStr) {
        if (!phoneStr) return { countryCode: '+1', number: '' };
        const codes = ['+91', '+1', '+44', '+49', '+81', '+61', '+86'];
        for (const code of codes) {
            if (phoneStr.startsWith(code)) {
                return { countryCode: code, number: phoneStr.substring(code.length).trim() };
            }
        }
        const match = phoneStr.match(/^(\+\d+)\s*(.*)$/);
        if (match) {
            return { countryCode: match[1], number: match[2] };
        }
        return { countryCode: '+1', number: phoneStr };
    }

    function validatePhoneNumber(countryCode, number) {
        const cleanNumber = number.replace(/\D/g, '');
        if (!cleanNumber) {
            return { isValid: true, error: '' };
        }
        
        switch (countryCode) {
            case '+91':
                if (cleanNumber.length !== 10) {
                    return { isValid: false, error: 'Indian phone numbers must be exactly 10 digits.' };
                }
                if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
                    return { isValid: false, error: 'Indian mobile numbers should start with 6, 7, 8, or 9.' };
                }
                break;
            case '+1':
                if (cleanNumber.length !== 10) {
                    return { isValid: false, error: 'US/Canada phone numbers must be exactly 10 digits.' };
                }
                break;
            case '+44':
                if (cleanNumber.length !== 10) {
                    return { isValid: false, error: 'UK mobile phone numbers must be exactly 10 digits.' };
                }
                break;
            case '+49':
                if (cleanNumber.length < 10 || cleanNumber.length > 11) {
                    return { isValid: false, error: 'German phone numbers must be 10 or 11 digits.' };
                }
                break;
            case '+81':
                if (cleanNumber.length < 9 || cleanNumber.length > 10) {
                    return { isValid: false, error: 'Japanese phone numbers must be 9 or 10 digits.' };
                }
                break;
            case '+61':
                if (cleanNumber.length !== 9) {
                    return { isValid: false, error: 'Australian phone numbers must be exactly 9 digits.' };
                }
                break;
            case '+86':
                if (cleanNumber.length !== 11) {
                    return { isValid: false, error: 'Chinese phone numbers must be exactly 11 digits.' };
                }
                if (!/^1\d{10}$/.test(cleanNumber)) {
                    return { isValid: false, error: 'Chinese mobile numbers must start with 1.' };
                }
                break;
            default:
                if (cleanNumber.length < 7 || cleanNumber.length > 15) {
                    return { isValid: false, error: 'Phone number must be between 7 and 15 digits.' };
                }
        }
        return { isValid: true, error: '' };
    }

    async function detectUserRegion() {
        if (detectedRegionData) return detectedRegionData;
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    detectedRegionData = {
                        city: data.city,
                        countryName: data.country_name,
                        countryCode: data.country_code,
                        callingCode: data.country_calling_code || getDialCodeByCountry(data.country_name)
                    };
                    return detectedRegionData;
                }
            }
        } catch (e) {
            console.error("IP Geolocation failed for region detection:", e);
        }
        
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) {
                const zoneLower = tz.toLowerCase();
                if (zoneLower.includes('calcutta') || zoneLower.includes('kolkata') || zoneLower.includes('india')) {
                    return { countryCode: 'IN', callingCode: '+91', countryName: 'India' };
                } else if (zoneLower.includes('london') || zoneLower.includes('europe/london') || zoneLower.includes('gb')) {
                    return { countryCode: 'GB', callingCode: '+44', countryName: 'United Kingdom' };
                } else if (zoneLower.includes('berlin') || zoneLower.includes('europe/berlin') || zoneLower.includes('germany')) {
                    return { countryCode: 'DE', callingCode: '+49', countryName: 'Germany' };
                } else if (zoneLower.includes('tokyo') || zoneLower.includes('asia/tokyo') || zoneLower.includes('japan')) {
                    return { countryCode: 'JP', callingCode: '+81', countryName: 'Japan' };
                } else if (zoneLower.includes('sydney') || zoneLower.includes('australia')) {
                    return { countryCode: 'AU', callingCode: '+61', countryName: 'Australia' };
                } else if (zoneLower.includes('shanghai') || zoneLower.includes('china')) {
                    return { countryCode: 'CN', callingCode: '+86', countryName: 'China' };
                }
            }
        } catch (e) {
            console.error("Timezone backup failed for region detection:", e);
        }
        
        return { countryCode: 'US', callingCode: '+1', countryName: 'United States' };
    }

    function getDialCodeByCountry(countryName) {
        const name = (countryName || '').toLowerCase();
        if (name.includes('india')) return '+91';
        if (name.includes('united states') || name.includes('usa') || name.includes('america')) return '+1';
        if (name.includes('united kingdom') || name.includes('uk') || name.includes('england') || name.includes('great britain')) return '+44';
        if (name.includes('germany')) return '+49';
        if (name.includes('japan')) return '+81';
        if (name.includes('australia')) return '+61';
        if (name.includes('china')) return '+86';
        return '+1';
    }

    async function detectAndSelectRegisterCountry() {
        const region = await detectUserRegion();
        if (region && region.callingCode) {
            if (phoneCountrySelect) {
                phoneCountrySelect.value = region.callingCode;
                const regPhone = document.getElementById('phone');
                if (regPhone) regPhone.dispatchEvent(new Event('input'));
            }
        }
    }

    function setupPhoneValidation(inputEl, selectEl, msgEl) {
        if (!inputEl || !selectEl || !msgEl) return null;
        
        const validate = () => {
            const val = inputEl.value.trim();
            if (!val) {
                msgEl.textContent = 'Phone number is optional.';
                msgEl.className = 'validation-msg info';
                inputEl.classList.remove('invalid-field');
                return true;
            }
            
            const countryCode = selectEl.value;
            const res = validatePhoneNumber(countryCode, val);
            if (res.isValid) {
                msgEl.textContent = '✓ Phone number format is valid.';
                msgEl.className = 'validation-msg valid';
                inputEl.classList.remove('invalid-field');
                return true;
            } else {
                msgEl.textContent = res.error;
                msgEl.className = 'validation-msg invalid';
                inputEl.classList.add('invalid-field');
                return false;
            }
        };
        
        inputEl.addEventListener('input', validate);
        selectEl.addEventListener('change', validate);
        
        return validate;
    }

    // Initialize phone validation rules
    const validateRegisterPhone = setupPhoneValidation(document.getElementById('phone'), phoneCountrySelect, phoneValidationMsg);
    const validateProfilePhone = setupPhoneValidation(profilePhoneInput, profilePhoneCountrySelect, profilePhoneValidationMsg);

    // Init
    detectUserRegion();
    showAuth();
});
