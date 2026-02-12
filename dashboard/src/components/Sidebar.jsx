import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ServerSelector from './ServerSelector';

export default function Sidebar({ user, setIsAuthenticated, onClose }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedGuild, setSelectedGuild] = useState(() => {
    const saved = localStorage.getItem('selectedGuild');
    return saved ? JSON.parse(saved) : null;
  });

  const handleGuildChange = (guild) => {
    setSelectedGuild(guild);
    localStorage.setItem('selectedGuild', JSON.stringify(guild));
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/dashboard/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ removeTrustedIP: true })
      });
      
      if (response.ok) {
        localStorage.removeItem('selectedGuild');
        setIsAuthenticated(false);
        window.location.href = '/dashboard/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setIsAuthenticated(false);
    }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Overview', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
    )},
    { path: '/dashboard/tickets', label: 'Tickets', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
    )},
    { path: '/dashboard/users', label: 'Users', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )},
    { path: '/dashboard/giveaways', label: 'Giveaways', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
    )},
    { path: '/dashboard/settings', label: 'Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    { path: '/dashboard/audit-logs', label: 'Audit Logs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    )},
    { path: '/dashboard/transcripts', label: 'Transcripts', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`${isOpen ? 'w-72' : 'w-20'} h-full bg-slate-900/50 backdrop-blur-xl border-r border-white/10 text-white transition-all duration-500 flex flex-col`}>
      {/* Header */}
      <div className="p-4 lg:p-6 flex items-center justify-between border-b border-white/5">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20">S</div>
            <h1 className="text-xl font-bold tracking-tight">Supreme <span className="text-indigo-400">Bot</span></h1>
          </div>
        )}
        <div className="flex items-center gap-1">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors lg:hidden"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Collapse button for desktop */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors hidden lg:block"
          >
            <svg className={`w-6 h-6 text-slate-400 transition-transform duration-500 ${!isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Server Selector */}
      {isOpen && (
        <div className="px-4 py-4 border-b border-white/5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Server</p>
          <ServerSelector selectedGuild={selectedGuild} onGuildChange={handleGuildChange} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
              isActive(item.path)
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <div className={`transition-colors duration-300 ${isActive(item.path) ? 'text-indigo-400' : 'group-hover:text-slate-200'}`}>
              {item.icon}
            </div>
            {isOpen && <span className="font-medium">{item.label}</span>}
            {isActive(item.path) && isOpen && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        {user && (
          <div className={`${isOpen ? 'flex items-center gap-3' : 'flex flex-col items-center'} p-2`}>
            <img 
              src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-indigo-500/30"
            />
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.username}</p>
                <p className="text-xs text-slate-500 truncate">Staff Member</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all ${!isOpen && 'mt-2'}`}
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
