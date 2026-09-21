import { useState } from 'react';
import './index.css';
import './App.css';
import { DataProvider } from './context/DataContext';
import { ChatProvider } from './context/ChatContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import { Footer } from './components/Footer';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import ForecastPage from './pages/ForecastPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { HistoricalDataPage } from './pages/HistoricalDataPage';

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePage} />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'map':
        return <LiveMapPage />;
      case 'forecast':
        return <ForecastPage />;
      case 'ai':
        return <AIAssistantPage />;
      case 'historical':
        return <HistoricalDataPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <DataProvider>
      <ChatProvider>
        <div className="app-layout">
          <Header />
          <div className="app-body">
            <Sidebar
              activePage={activePage}
              onNavigate={setActivePage}
            />
            <div className="main-content">
              {renderPage()}
            </div>
          </div>
          <Footer />
        </div>
      </ChatProvider>
    </DataProvider>
  );
}

export default App;
