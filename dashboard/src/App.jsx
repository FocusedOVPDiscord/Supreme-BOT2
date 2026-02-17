import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './i18n'; // Initialize i18n
import './performance.css'; // Performance-based styles
import './security.css'; // Security protection
import './theme.css'; // Theme system
import { initDevToolsProtection } from './utils/devToolsProtection';
import Login from './pages/Login';
import ServerSelection from './pages/ServerSelection';
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
import Growtopia from './pages/Growtopia';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedGuild, setSelectedGuild] = useState(() => {
    // Try to restore selectedGuild from sessionStorage
    const saved = sessionStorage.getItem('selectedGuild');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist selectedGuild to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedGuild) {
      sessionStorage.setItem('selectedGuild', JSON.stringify(selectedGuild));
    } else {
      sessionStorage.removeItem('selectedGuild');
    }
  }, [selectedGuild]);

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

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/dashboard/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard/servers" replace />
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
            )
          } 
        />

        {/* Protected routes */}
        {isAuthenticated ? (
          <>
            {/* Server selection route */}
            <Route 
              path="/dashboard/servers" 
              element={
                <ServerSelection 
                  setSelectedGuild={setSelectedGuild} 
                  user={user} 
                />
              } 
            />

            {/* Dashboard routes - require server selection */}
            <Route 
              path="/dashboard/*" 
              element={
                selectedGuild ? (
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
                        selectedGuild={selectedGuild}
                        setSelectedGuild={setSelectedGuild}
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
                          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shadow-lg shadow-green-500/20 overflow-hidden">
                            <img src="/logo.webp" alt="SM" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-white font-bold text-sm">{selectedGuild.name}</span>
                        </div>
                      </div>

                      <Routes>
                        <Route path="/" element={<Dashboard selectedGuild={selectedGuild} />} />
                        <Route path="/tickets" element={<Tickets selectedGuild={selectedGuild} />} />
                        <Route path="/users" element={<Users selectedGuild={selectedGuild} />} />
                        <Route path="/giveaways" element={<Giveaways selectedGuild={selectedGuild} />} />
                        <Route path="/settings" element={<Settings selectedGuild={selectedGuild} />} />
                        <Route path="/audit-logs" element={<AuditLogs selectedGuild={selectedGuild} />} />
                        <Route path="/transcripts" element={<Transcripts selectedGuild={selectedGuild} />} />
                        <Route path="/ai" element={<AI selectedGuild={selectedGuild} />} />
                        <Route path="/staff-verification/:guildId" element={<StaffVerification />} />
                        <Route path="/welcome-setup/:guildId" element={<WelcomeSetup />} />
                        <Route path="/growtopia" element={<Growtopia selectedGuild={selectedGuild} />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </main>
                  </div>
                ) : (
                  <Navigate to="/dashboard/servers" replace />
                )
              } 
            />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/dashboard/login" replace />} />
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
