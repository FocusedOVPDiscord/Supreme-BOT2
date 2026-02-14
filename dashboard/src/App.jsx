import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './i18n'; // Initialize i18n
import './performance.css'; // Performance-based styles
import './security.css'; // Security protection
import './theme.css'; // Theme system
import { initDevToolsProtection } from './utils/devToolsProtection';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Giveaways from './pages/Giveaways';
import Settings from './pages/BotSettings';
import AuditLogs from './pages/AuditLogs';
import Transcripts from './pages/Transcripts';
import AI from './pages/AI';
import StaffVerification from './pages/StaffVerification';
import WelcomeSetup from './pages/WelcomeSetup';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Initialize DevTools protection
    initDevToolsProtection();
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/dashboard/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-[#0f172a] overflow-hidden">
        {/* Mobile overlay */}
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'active' : ''} lg:hidden`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <div className={`
          fixed lg:relative z-50 h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar 
            user={user} 
            setIsAuthenticated={setIsAuthenticated} 
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto relative">
          {/* Mobile header bar */}
          <div className="sticky top-0 z-30 lg:hidden bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-500/20">S</div>
              <span className="text-white font-bold text-sm">Supreme Bot</span>
            </div>
          </div>

          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />} />
            <Route path="/dashboard/tickets" element={<Tickets />} />
            <Route path="/dashboard/users" element={<Users />} />
            <Route path="/dashboard/giveaways" element={<Giveaways />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/audit-logs" element={<AuditLogs />} />
            <Route path="/dashboard/transcripts" element={<Transcripts />} />
            <Route path="/dashboard/ai" element={<AI />} />
            <Route path="/dashboard/staff-verification/:guildId" element={<StaffVerification />} />
            <Route path="/dashboard/welcome-setup/:guildId" element={<WelcomeSetup />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
