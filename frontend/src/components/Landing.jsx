import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
    return (
        <div>
            <nav>
                <div className="nav-logo">TradeLens</div>
                <div className="nav-links">
                    <a href="#features">Features</a>
                    <a href="#about">About</a>
                    <Link to="/login" className="nav-cta">Get Started →</Link>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-bg"></div>
                <div className="hero-badge">✨ AI-Powered Trading Analytics</div>
                <h1>Analyze Your<br /><span>Trading Edge</span></h1>
                <p>TradeLens gives you deep insight into your trades — PnL tracking, risk profiling, fraud detection, and AI-powered coaching in one clean dashboard.</p>
                <div className="hero-btns">
                    <Link to="/login" className="btn-primary-hero">Start Analyzing Free →</Link>
                    <a href="#features" className="btn-secondary-hero">See Features</a>
                </div>
            </section>

            <div className="stats-bar">
                <div className="stat"><div className="stat-num">10K+</div><div className="stat-label">Trades Analyzed</div></div>
                <div className="stat"><div className="stat-num">99%</div><div className="stat-label">Uptime</div></div>
                <div className="stat"><div className="stat-num">AI</div><div className="stat-label">Powered Insights</div></div>
                <div className="stat"><div className="stat-num">Real-time</div><div className="stat-label">Market Charts</div></div>
            </div>

            <div id="features" className="features-section">
                <div className="section-label">Features</div>
                <div className="section-title">Everything you need to trade smarter</div>
                <p className="section-sub">From real-time market charts to AI risk profiles, TradeLens covers every angle of your performance.</p>
                <div className="features-grid">
                    <div className="feature-card"><span className="feature-icon">📊</span><h3>PnL Dashboard</h3><p>Track your real-time profit & loss across all positions with clean visual summaries.</p></div>
                    <div className="feature-card"><span className="feature-icon">🤖</span><h3>AI Copilot</h3><p>Ask your AI trading assistant about win rates, risk exposure, best symbols, and strategies.</p></div>
                    <div className="feature-card"><span className="feature-icon">⚡</span><h3>Risk Profiler</h3><p>Visualize your risk score dynamically based on open exposure and consecutive losses.</p></div>
                    <div className="feature-card"><span className="feature-icon">🔍</span><h3>Fraud Detection</h3><p>Automatic anomaly monitoring flags wash trades, HFT spam, and unusual sizing patterns.</p></div>
                    <div className="feature-card"><span className="feature-icon">📈</span><h3>Market Charts</h3><p>Live BTC/USD candlestick chart with SMC/ICT overlays powered by TradingView Lightweight.</p></div>
                    <div className="feature-card"><span className="feature-icon">🏦</span><h3>Bank Integration</h3><p>Link your bank account and manage fund allocations and simulated withdrawals.</p></div>
                </div>
            </div>

            <div className="cta-section">
                <h2>Ready to level up your trading?</h2>
                <p>Join TradeLens today — it takes under 30 seconds to create your account.</p>
                <Link to="/login" className="btn-white">Create Free Account →</Link>
            </div>

            <footer className="footer">
                <div className="nav-logo">TradeLens</div>
                <p>© 2026 TradeLens. All rights reserved.</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Built for traders, by traders.</p>
            </footer>
        </div>
    );
};

export default Landing;
