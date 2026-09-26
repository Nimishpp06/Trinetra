import { LayoutGrid, TrendingUp, Map, Bot, History, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type Page = 'dashboard' | 'analytics' | 'map' | 'forecast' | 'ai' | 'historical';

export const PAGE_PATHS: Record<Page, string> = {
    dashboard: '/dashboard',
    analytics: '/analytics',
    map: '/map',
    forecast: '/forecast',
    ai: '/ai',
    historical: '/historical',
};

export function pageFromPath(pathname: string): Page {
    const match = (Object.keys(PAGE_PATHS) as Page[]).find(page => PAGE_PATHS[page] === pathname);
    return match ?? 'dashboard';
}

interface SidebarProps {
    activePage: Page;
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'forecast', label: 'Forecast', icon: Clock },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
    { id: 'historical', label: 'Historical Data', icon: History },
];

export const Sidebar = ({ activePage }: SidebarProps) => {
    const navigate = useNavigate();

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
                            onClick={() => navigate(PAGE_PATHS[item.id])}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && navigate(PAGE_PATHS[item.id])}
                        >
                            <Icon className="nav-item__icon" size={18} />
                            <span>{item.label}</span>
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
};
