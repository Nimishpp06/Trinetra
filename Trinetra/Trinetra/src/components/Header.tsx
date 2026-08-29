import { Search, Bell, User } from 'lucide-react';
import { TrinetraLogo } from './TrinetraLogo';
import '../App.css';

interface HeaderProps {
    onSearch?: (query: string) => void;
    isLoggedIn: boolean;
    onProfileClick: () => void;
}

export const Header = ({ onSearch, isLoggedIn, onProfileClick }: HeaderProps) => {
    return (
        <header className="header">
            <div className="header__brand">
                <div className="trinetra-logo">
                    <TrinetraLogo />
                    <span className="trinetra-wordmark">Trinetra</span>
                </div>
            </div>

            <div className="header__search">
                <Search className="header__search-icon" size={14} />
                <input
                    className="header__search-input"
                    type="text"
                    placeholder="Search locations, sensors..."
                    onChange={e => onSearch?.(e.target.value)}
                />
            </div>

            <div className="header__actions">
                <button className="header__icon-btn" title="Notifications">
                    <Bell size={18} />
                </button>
                <button
                    className={`header__icon-btn${isLoggedIn ? ' header__icon-btn--logged-in' : ''}`}
                    title={isLoggedIn ? 'View Profile' : 'Sign In'}
                    onClick={onProfileClick}
                >
                    <User size={18} />
                </button>
            </div>
        </header>
    );
};
