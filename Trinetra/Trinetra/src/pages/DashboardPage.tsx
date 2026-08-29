// Dashboard page
import { AlertBanner } from '../components/AlertBanner';
import { KPIGrid } from '../components/KPIGrid';
import { LocationLeaderboard } from '../components/LocationLeaderboard';
import type { Page } from '../components/Sidebar';

interface DashboardPageProps {
    onNavigate: (page: Page) => void;
    tempUnit: 'C' | 'F';
}

export const DashboardPage = ({ onNavigate, tempUnit }: DashboardPageProps) => (
    <div className="page-content">
        <AlertBanner />
        <KPIGrid tempUnit={tempUnit} />
        <LocationLeaderboard onViewMap={() => onNavigate('map')} />
    </div>
);
