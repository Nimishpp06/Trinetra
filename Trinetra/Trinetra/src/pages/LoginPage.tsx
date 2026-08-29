import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import '../App.css';

interface LoginPageProps {
    onLoginSuccess: (user: { name: string; email: string; role: string; division: string; joinedDate: string }) => void;
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
    const [isLoginTab, setIsLoginTab] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Student');
    const [division, setDivision] = useState('Engineering Block');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isLoginTab) {
            // Simulated Simple Login validation
            if (!email || !password) {
                setError('All fields are required.');
                return;
            }
            if (password.length < 4) {
                setError('Password must be at least 4 characters.');
                return;
            }

            // Successfully authenticated
            onLoginSuccess({
                name: email.split('@')[0].toUpperCase(),
                email,
                role: 'Somaiya Research Fellow',
                division: 'Science Lab (Block C)',
                joinedDate: 'Joined Aug 2024',
            });
        } else {
            // Simulated Simple Register validation
            if (!name || !email || !password) {
                setError('All fields are required.');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters.');
                return;
            }

            // Successfully authenticated register
            onLoginSuccess({
                name,
                email,
                role,
                division,
                joinedDate: 'Joined Today',
            });
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-brand">
                    <img
                        src="/trinetra.png"
                        alt="Trinetra Logo"
                        style={{ height: '40px', width: 'auto', display: 'block', objectFit: 'contain', borderRadius: '50%' }}
                    />
                    <span className="login-brand-title">Trinetra</span>
                </div>
                <p className="login-subtitle">Somaiya Vidyavihar Air Quality Suite</p>

                {/* Switch Tabs */}
                <div className="login-tabs">
                    <button
                        className={`login-tab ${isLoginTab ? 'active' : ''}`}
                        onClick={() => { setIsLoginTab(true); setError(''); }}
                    >
                        Sign In
                    </button>
                    <button
                        className={`login-tab ${!isLoginTab ? 'active' : ''}`}
                        onClick={() => { setIsLoginTab(false); setError(''); }}
                    >
                        Register
                    </button>
                </div>

                {error && <div className="login-error-alert">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    {!isLoginTab && (
                        <div className="login-input-group">
                            <label className="login-label">Full Name</label>
                            <div className="login-input-wrap">
                                <User size={16} className="login-input-icon" />
                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    className="login-input"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="login-input-group">
                        <label className="login-label">Email Address</label>
                        <div className="login-input-wrap">
                            <Mail size={16} className="login-input-icon" />
                            <input
                                type="email"
                                placeholder="..."
                                className="login-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="login-input-group">
                        <label className="login-label">Password</label>
                        <div className="login-input-wrap">
                            <Lock size={16} className="login-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="login-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {!isLoginTab && (
                        <>
                            <div className="login-input-group">
                                <label className="login-label">Campus Identity</label>
                                <select
                                    className="login-select"
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                >
                                    <option value="Student">Student</option>
                                    <option value="Faculty Member">Faculty Member</option>
                                    <option value="Research Associate">Research Associate</option>
                                    <option value="Campus Administrator">Campus Administrator</option>
                                </select>
                            </div>

                            <div className="login-input-group">
                                <label className="login-label">Primary Block / Department</label>
                                <select
                                    className="login-select"
                                    value={division}
                                    onChange={e => setDivision(e.target.value)}
                                >
                                    <option value="Engineering Block">Engineering Block</option>
                                    <option value="Sports Ground / Gym">Sports Ground / Gym</option>
                                    <option value="Hostel Campus">Hostel Campus</option>
                                    <option value="Vidyavihar Station Area">Vidyavihar Station Area</option>
                                </select>
                            </div>
                        </>
                    )}

                    <button type="submit" className="login-submit-btn">
                        {isLoginTab ? 'Sign In Codebase' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};
