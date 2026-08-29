import { LayoutGrid, TrendingUp, Map, Bot, History, AlertCircle } from 'lucide-react';

export type Page = 'dashboard' | 'analytics' | 'map' | 'ai' | 'historical' | 'profile' | 'login';

interface SidebarProps {
    activePage: Page;
    onNavigate: (page: Page) => void;
    onReportIssue: () => void;
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'historical', label: 'Historical Data', icon: History },
];

export const Sidebar = ({ activePage, onNavigate, onReportIssue }: SidebarProps) => {
    return (
        <aside className="sidebar">
            <div className="sidebar__header">
                <div className="sidebar__label">NAVIGATION</div>
                <div className="sidebar__suite">Monitoring Suite</div>
            </div>

            <nav className="sidebar__nav">
                {navItems.map(item => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            className={`nav-item${activePage === item.id ? ' active' : ''}`}
                            onClick={() => onNavigate(item.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && onNavigate(item.id)}
                        >
                            <Icon className="nav-item__icon" size={18} />
                            <span>{item.label}</span>
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar__footer">
                <button className="report-issue-btn" onClick={onReportIssue}>
                    <AlertCircle size={15} />
                    <span>Report Issue</span>
                </button>
            </div>
        </aside>
    );
};
