import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { i18n } = useTranslation();
  const [theme, setThemeState] = useState(localStorage.getItem('supreme-bot-theme') || 'dark');
  const [language, setLanguageState] = useState(localStorage.getItem('supreme-bot-language') || 'en');
  
  const [settings, setSettings] = useState({
    autoRole: '',
    welcomeChannel: '',
    ticketCategory: ''
  });
  const [guildData, setGuildData] = useState({ roles: [], channels: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, guildDataRes] = await Promise.all([
          fetch('/api/dashboard/settings', { credentials: 'include' }),
          fetch('/api/dashboard/guild-data', { credentials: 'include' })
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings({
            autoRole: data.autoRole || '',
            welcomeChannel: data.welcomeChannel || '',
            ticketCategory: data.ticketCategory || ''
          });
        }

        if (guildDataRes.ok) {
          const data = await guildDataRes.json();
          setGuildData(data);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading settings...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Bot <span className="gradient-text">Settings</span></h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Configure core bot functionality and automation.</p>
      </header>

      {message.text && (
        <div className={`p-4 rounded-2xl border animate-in slide-in-from-top duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Theme & Language Settings */}
        <section className="glass rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 space-y-6">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            Appearance & Language
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setThemeState('dark');
                    localStorage.setItem('supreme-bot-theme', 'dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/10 bg-slate-800/50 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🌙</div>
                    <div className="text-white text-sm font-semibold">Dark</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setThemeState('light');
                    localStorage.setItem('supreme-bot-theme', 'light');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    theme === 'light'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/10 bg-slate-800/50 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">☀️</div>
                    <div className="text-white text-sm font-semibold">Light</div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Language</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setLanguageState('en');
                    localStorage.setItem('supreme-bot-language', 'en');
                    i18n.changeLanguage('en');
                    document.documentElement.setAttribute('dir', 'ltr');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    language === 'en'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/10 bg-slate-800/50 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🇬🇧</div>
                    <div className="text-white text-xs font-semibold">EN</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setLanguageState('fr');
                    localStorage.setItem('supreme-bot-language', 'fr');
                    i18n.changeLanguage('fr');
                    document.documentElement.setAttribute('dir', 'ltr');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    language === 'fr'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/10 bg-slate-800/50 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🇫🇷</div>
                    <div className="text-white text-xs font-semibold">FR</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setLanguageState('ar');
                    localStorage.setItem('supreme-bot-language', 'ar');
                    i18n.changeLanguage('ar');
                    document.documentElement.setAttribute('dir', 'rtl');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    language === 'ar'
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/10 bg-slate-800/50 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🇸🇦</div>
                    <div className="text-white text-xs font-semibold">AR</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 space-y-6">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Automation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Auto-Role</label>
              <select 
                value={settings.autoRole} 
                onChange={(e) => setSettings({...settings, autoRole: e.target.value})}
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
              >
                <option value="">None</option>
                {guildData.roles.map(role => (
                  <option key={role.id} value={role.id} style={{ color: role.color }}>{role.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 px-2">Role given to new members automatically.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Welcome Channel</label>
              <select 
                value={settings.welcomeChannel} 
                onChange={(e) => setSettings({...settings, welcomeChannel: e.target.value})}
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none"
              >
                <option value="">None</option>
                {guildData.channels.map(channel => (
                  <option key={channel.id} value={channel.id}># {channel.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 px-2">Channel where welcome messages are sent.</p>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 space-y-6">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
            Ticket System
          </h2>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ticket Category ID</label>
            <input 
              type="text" 
              value={settings.ticketCategory} 
              onChange={(e) => setSettings({...settings, ticketCategory: e.target.value})}
              className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
              placeholder="Enter Category ID"
            />
            <p className="text-[10px] text-slate-500 px-2">Category where new ticket channels will be created.</p>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`px-10 py-4 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
