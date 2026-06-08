import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Auth = () => {
    const navigate = useNavigate();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        phone_number: '',
        broker_name: '',
        balance: '10000',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const bodyData = {
            username: formData.username,
            password: formData.password,
        };

        if (!isLoginMode) {
            bodyData.email = formData.email;
            bodyData.phone_number = formData.phone_number;
            bodyData.broker_name = formData.broker_name;
            bodyData.balance = parseFloat(formData.balance) || 10000;
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
                    setIsLoginMode(true);
                    setSuccess('Registration successful. Please log in.');
                    setFormData({ ...formData, password: '' });
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
    };

    return (
        <div className="auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-box">
                <div className="auth-header">
                    <h1>TradeLens</h1>
                    <p>{isLoginMode ? 'Sign in to analyze your trades' : 'Create an account to get started'}</p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                    </div>

                    {!isLoginMode && (
                        <>
                            <div className="input-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <label>Phone Number</label>
                                <input type="text" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Broker</label>
                                <input type="text" name="broker_name" value={formData.broker_name} onChange={handleChange} />
                            </div>
                            <div className="input-group">
                                <label>Starting Balance</label>
                                <input type="number" name="balance" value={formData.balance} onChange={handleChange} />
                            </div>
                        </>
                    )}

                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>

                    <button type="submit" className="btn primary-btn w-100" style={{ marginTop: '1rem' }}>
                        {isLoginMode ? 'Login' : 'Register'}
                    </button>

                    {error && <div className="error-message" style={{ color: 'var(--danger)', marginTop: '1rem', textAlign: 'center' }}>{error}</div>}
                    {success && <div className="success-message" style={{ color: 'var(--success)', marginTop: '1rem', textAlign: 'center' }}>{success}</div>}

                    <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {isLoginMode ? (
                            <span>Don't have an account? <Link to="#" onClick={(e) => { e.preventDefault(); setIsLoginMode(false); setError(''); setSuccess(''); }}>Register</Link></span>
                        ) : (
                            <span>Already have an account? <Link to="#" onClick={(e) => { e.preventDefault(); setIsLoginMode(true); setError(''); setSuccess(''); }}>Login</Link></span>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Auth;
