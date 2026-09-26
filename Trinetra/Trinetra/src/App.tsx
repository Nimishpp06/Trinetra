import './index.css';
import './App.css';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { ChatProvider } from './context/ChatContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { Sidebar, pageFromPath } from './components/Sidebar';
import { Footer } from './components/Footer';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import ForecastPage from './pages/ForecastPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { HistoricalDataPage } from './pages/HistoricalDataPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallback } from './pages/AuthCallback';

function AppLayout() {
  const { pathname } = useLocation();
  const activePage = pageFromPath(pathname);

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar activePage={activePage} />
        <div className="main-content">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <DataProvider>
                  <ChatProvider>
                    <AppLayout />
                  </ChatProvider>
                </DataProvider>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="map" element={<LiveMapPage />} />
              <Route path="forecast" element={<ForecastPage />} />
              <Route path="ai" element={<AIAssistantPage />} />
              <Route path="historical" element={<HistoricalDataPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
