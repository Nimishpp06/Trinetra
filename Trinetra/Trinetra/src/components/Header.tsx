import { Search, Bell } from 'lucide-react';
import { TrinetraLogo } from './TrinetraLogo';
import '../App.css';

export const Header = () => {
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
                />
            </div>

            <div className="header__actions">
                <button className="header__icon-btn" title="Notifications">
                    <Bell size={18} />
                </button>
            </div>
        </header>
    );
};
