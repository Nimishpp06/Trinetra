import { KPIGrid } from '../components/KPIGrid';
import { LocationLeaderboard } from '../components/LocationLeaderboard';
import type { Page } from '../components/Sidebar';

interface DashboardPageProps {
    onNavigate: (page: Page) => void;
}

export const DashboardPage = ({ onNavigate }: DashboardPageProps) => (
    <div className="page-content">
        <KPIGrid />
        <LocationLeaderboard onViewMap={() => onNavigate('map')} />
    </div>
);
