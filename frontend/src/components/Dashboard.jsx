import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart } from 'lightweight-charts';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [trades, setTrades] = useState([]);
    const chartContainerRef = useRef();
    const [chart, setChart] = useState(null);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    fetchAnalytics();
                    fetchTrades();
                } else {
                    navigate('/login');
                }
            } catch (err) {
                navigate('/login');
            }
        };
        checkSession();
    }, [navigate]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics');
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error("Error fetching analytics", err);
        }
    };

    const fetchTrades = async () => {
        try {
            const res = await fetch('/api/trades');
            if (res.ok) {
                const data = await res.json();
                setTrades(data);
            }
        } catch (err) {
            console.error("Error fetching trades", err);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        navigate('/login');
    };

    useEffect(() => {
        if (chartContainerRef.current && !chart) {
            const newChart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 400,
                layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
                grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
            });
            const lineSeries = newChart.addLineSeries({ color: '#6366f1', lineWidth: 2 });
            lineSeries.setData([
                { time: '2023-01-01', value: 100 },
                { time: '2023-01-02', value: 120 },
                { time: '2023-01-03', value: 110 },
                { time: '2023-01-04', value: 130 },
                { time: '2023-01-05', value: 140 }
            ]);
            setChart(newChart);

            const handleResize = () => {
                newChart.applyOptions({ width: chartContainerRef.current.clientWidth });
            };
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                newChart.remove();
            };
        }
    }, [chart]);

    if (!user) return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>TradeLens</h2>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li className="active"><a href="#">Dashboard</a></li>
                        <li><a href="#">Trade History</a></li>
                    </ul>
                </nav>
                <div className="sidebar-footer">
                    <div className="trader-details">
                        <p id="user-display" style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{user.username}</p>
                        <p className="detail-text">ID: {user.custom_user_id || '-'}</p>
                        <p className="detail-text">Broker: {user.broker_name || '-'}</p>
                        <p className="detail-text">Balance: ₹{user.balance || '-'}</p>
                    </div>
                    <button onClick={handleLogout} className="btn secondary-btn" style={{ width: '100%', marginTop: '1rem' }}>Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header className="topbar">
                    <h1>Overview</h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn primary-btn">Log Trade</button>
                    </div>
                </header>

                <div className="content-sections" style={{ padding: '2rem', overflowY: 'auto' }}>
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <h3>Total PnL</h3>
                            <p className={`metric-value ${analytics?.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                                ₹{analytics?.total_pnl?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        <div className="metric-card">
                            <h3>Win Rate</h3>
                            <p className="metric-value">{analytics?.win_rate?.toFixed(1) || '0'}%</p>
                        </div>
                        <div className="metric-card">
                            <h3>Total Trades (Closed)</h3>
                            <p className="metric-value">{analytics?.total_closed || 0}</p>
                        </div>
                    </div>

                    <div className="market-chart-container" style={{ marginBottom: '2rem' }}>
                        <div className="market-chart-card">
                            <h3>Market Action (BTC/USD)</h3>
                            <div ref={chartContainerRef} style={{ width: '100%', height: '400px', marginTop: '1rem' }}></div>
                        </div>
                    </div>

                    <div className="recent-trades-container">
                        <h3>Recent Trades</h3>
                        <div className="journal-card" style={{ marginTop: '1rem' }}>
                            <div className="table-responsive">
                                <table className="trades-table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Symbol</th>
                                            <th>Type</th>
                                            <th>Entry Price</th>
                                            <th>Status</th>
                                            <th>PnL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.length === 0 ? (
                                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No trades logged yet.</td></tr>
                                        ) : (
                                            trades.slice(0, 5).map(t => (
                                                <tr key={t.id}>
                                                    <td>{new Date(t.entry_date).toLocaleDateString()}</td>
                                                    <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                                                    <td><span className={`badge ${t.trade_type.toLowerCase()}`}>{t.trade_type}</span></td>
                                                    <td>₹{t.entry_price}</td>
                                                    <td><span className={`badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                                                    <td className={t.pnl >= 0 ? 'positive' : 'negative'}>
                                                        {t.pnl ? `₹${t.pnl}` : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
