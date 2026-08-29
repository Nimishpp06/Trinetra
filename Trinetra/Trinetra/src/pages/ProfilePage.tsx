import { User, Shield, CheckCircle, Flame, Mail, MapPin } from 'lucide-react';
import '../App.css';

interface ProfilePageProps {
    currentUser: {
        name: string;
        email: string;
        role: string;
        division: string;
        joinedDate: string;
    };
    tempUnit: 'C' | 'F';
    onTempUnitChange: (unit: 'C' | 'F') => void;
    onLogout: () => void;
}

export const ProfilePage = ({ currentUser, tempUnit, onTempUnitChange, onLogout }: ProfilePageProps) => {
    return (
        <div className="page-content">
            <div className="profile-header">
                <h1>User Profile</h1>
                <p>Manage your account settings, campus preferences, and view contribution history.</p>
            </div>

            <div className="profile-grid">
                {/* Profile Card */}
                <div className="profile-card">
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar">
                            <User size={40} />
                        </div>
                    </div>
                    <h2 className="profile-name">{currentUser.name}</h2>
                    <p className="profile-role">{currentUser.role}</p>
                    <div className="profile-meta">
                        <div className="profile-meta-item">
                            <Mail size={14} />
                            <span>{currentUser.email}</span>
                        </div>
                        <div className="profile-meta-item">
                            <MapPin size={14} />
                            <span>{currentUser.division}</span>
                        </div>
                    </div>
                    <button className="profile-logout-btn" onClick={onLogout}>
                        Log Out Account
                    </button>
                </div>

                {/* Main profile content */}
                <div className="profile-main">
                    <div className="profile-section">
                        <h3>Campus Clean-Air Contributions</h3>
                        <div className="profile-stats-grid">
                            <div className="profile-stat-box">
                                <div className="profile-stat-icon red">
                                    <Flame size={20} />
                                </div>
                                <div className="profile-stat-details">
                                    <div className="profile-stat-num">14</div>
                                    <div className="profile-stat-label">Issues Reported</div>
                                </div>
                            </div>
                            <div className="profile-stat-box">
                                <div className="profile-stat-icon green">
                                    <CheckCircle size={20} />
                                </div>
                                <div className="profile-stat-details">
                                    <div className="profile-stat-num">12</div>
                                    <div className="profile-stat-label">Issues Resolved</div>
                                </div>
                            </div>
                            <div className="profile-stat-box">
                                <div className="profile-stat-icon blue">
                                    <Shield size={20} />
                                </div>
                                <div className="profile-stat-details">
                                    <div className="profile-stat-num">Level 3</div>
                                    <div className="profile-stat-label">Campus Guardian</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3>Display Settings</h3>
                        <div className="profile-settings-list">
                            <div className="profile-setting-item">
                                <div className="setting-info">
                                    <div className="setting-title">Use Fahrenheit (°F)</div>
                                    <div className="setting-description">Toggle temperature displays between Celsius (°C) and Fahrenheit (°F).</div>
                                </div>
                                <label className="setting-toggle">
                                    <input
                                        type="checkbox"
                                        checked={tempUnit === 'F'}
                                        onChange={(e) => onTempUnitChange(e.target.checked ? 'F' : 'C')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="profile-section">
                        <h3>Notification Settings</h3>
                        <div className="profile-settings-list">
                            <div className="profile-setting-item">
                                <div className="setting-info">
                                    <div className="setting-title">Severe Air Quality Alerts</div>
                                    <div className="setting-description">Receive immediate notifications when the campus AQI exceeds 200.</div>
                                </div>
                                <label className="setting-toggle">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="profile-setting-item">
                                <div className="setting-info">
                                    <div className="setting-title">Daily Health Forecast</div>
                                    <div className="setting-description">Get a short daily digest of predictions and health advisories.</div>
                                </div>
                                <label className="setting-toggle">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <div className="profile-setting-item">
                                <div className="setting-info">
                                    <div className="setting-title">Weekly Trend Reports</div>
                                    <div className="setting-description">Receive emails detailing campus micro-climate variations.</div>
                                </div>
                                <label className="setting-toggle">
                                    <input type="checkbox" />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
