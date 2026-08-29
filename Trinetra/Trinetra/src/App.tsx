import { useState } from 'react';
import './index.css';
import './App.css';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ReportIssueModal } from './components/ReportIssueModal';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { HistoricalDataPage } from './pages/HistoricalDataPage';

import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';

type UserSession = {
  name: string;
  email: string;
  role: string;
  division: string;
  joinedDate: string;
} | null;

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [showReportModal, setShowReportModal] = useState(false);
  const [userSession, setUserSession] = useState<UserSession>(null);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  const handleProfileClick = () => {
    if (userSession) {
      setActivePage('profile');
    } else {
      setActivePage('login');
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePage} tempUnit={tempUnit} />;
      case 'analytics':
        return <AnalyticsPage tempUnit={tempUnit} />;
      case 'map':
        return <LiveMapPage />;
      case 'ai':
        return (
          <AIAssistantPage />
        );
      case 'historical':
        return <HistoricalDataPage tempUnit={tempUnit} />;
      case 'login':
        return (
          <LoginPage
            onLoginSuccess={(user) => {
              setUserSession(user);
              setActivePage('dashboard');
            }}
          />
        );
      case 'profile':
        if (!userSession) return <DashboardPage onNavigate={setActivePage} tempUnit={tempUnit} />;
        return (
          <ProfilePage
            currentUser={userSession}
            tempUnit={tempUnit}
            onTempUnitChange={setTempUnit}
            onLogout={() => {
              setUserSession(null);
              setActivePage('login');
            }}
          />
        );
      default:
        return <DashboardPage onNavigate={setActivePage} tempUnit={tempUnit} />;
    }
  };

  return (
    <div className="app-layout">
      <Header
        isLoggedIn={!!userSession}
        onProfileClick={handleProfileClick}
      />
      <div className="app-body">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          onReportIssue={() => setShowReportModal(true)}
        />
        <div className="main-content">
          {renderPage()}
        </div>
      </div>
      <Footer />
      {showReportModal && (
        <ReportIssueModal onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}

export default App;
