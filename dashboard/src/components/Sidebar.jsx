import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ServerSelector from './ServerSelector';
import ThemeLanguageSwitcher from './ThemeLanguageSwitcher';

export default function Sidebar({ user, selectedGuild, setSelectedGuild, setIsAuthenticated, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const handleGuildChange = (guild) => {
    setSelectedGuild(guild);
    navigate('/dashboard');
  };

  const handleChangeServer = () => {
    setSelectedGuild(null);
    navigate('/dashboard/servers');
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
        sessionStorage.removeItem('selectedGuild');
        setSelectedGuild(null);
        setIsAuthenticated(false);
        window.location.href = '/dashboard/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setIsAuthenticated(false);
    }
  };

  const menuItems = [
    { path: '/dashboard', label: t('nav.overview'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
    )},
    { path: '/dashboard/tickets', label: t('nav.tickets'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
    )},
    { path: '/dashboard/users', label: t('nav.users'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )},
    { path: '/dashboard/giveaways', label: t('nav.giveaways'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
    )},
    { path: '/dashboard/settings', label: t('nav.settings'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    { path: `/dashboard/welcome-setup/${selectedGuild?.id || ''}`, label: t('nav.welcomeSetup'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
    ), disabled: !selectedGuild },

    { path: '/dashboard/audit-logs', label: t('nav.auditLogs'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    )},
    { path: '/dashboard/transcripts', label: t('nav.transcripts'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    { path: '/dashboard/ai', label: t('nav.ai'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    )},
    { path: `/dashboard/staff-verification/${selectedGuild?.id || ''}`, label: t('nav.staffVerification'), icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ), disabled: !selectedGuild },
    { path: '/dashboard/growtopia', label: '🎮 Growtopia Prices', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
    )},
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`${isOpen ? 'w-72' : 'w-20'} h-full bg-slate-900/50 backdrop-blur-xl border-r border-white/10 text-white transition-all duration-500 flex flex-col`}>
      {/* Header */}
      <div className="p-4 lg:p-6 flex items-center justify-between border-b border-white/5">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-lg shadow-green-500/20 overflow-hidden">
              <img src="/logo.webp" alt="SM" className="w-full h-full object-cover" />
            </div>
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

      {/* Theme & Language Switcher */}
      {isOpen && (
        <div className="px-4 py-3 border-b border-white/5 flex justify-center">
          <ThemeLanguageSwitcher />
        </div>
      )}

      {/* Server Selector */}
      {isOpen && (
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3 px-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Server</p>
            <button
              onClick={handleChangeServer}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              title="Change server"
            >
              Change
            </button>
          </div>
          <ServerSelector selectedGuild={selectedGuild} onGuildChange={handleGuildChange} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.disabled) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-600 cursor-not-allowed opacity-50"
                title="Select a server first"
              >
                <div>{item.icon}</div>
                {isOpen && <span className="font-medium">{item.label}</span>}
              </div>
            );
          }
          return (
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
          );
        })}
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
                <p className="text-xs text-slate-500 truncate">{t('common.staffMember')}</p>
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
