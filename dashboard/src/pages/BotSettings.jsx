import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();
  
  const [settings, setSettings] = useState({
    autoRole: '',
    ticketCategory: ''
  });
  const [guildData, setGuildData] = useState({ roles: [], channels: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentAutoRole, setCurrentAutoRole] = useState(null);

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
            ticketCategory: data.ticketCategory || ''
          });
          // Detect if auto-role is already set up
          if (data.autoRole) {
            setCurrentAutoRole(data.autoRole);
          }
        }

        if (guildDataRes.ok) {
          const data = await guildDataRes.json();
          setGuildData(data);
          
          // If autoRole is set, find the role name for display
          if (settings.autoRole && data.roles) {
            const role = data.roles.find(r => r.id === settings.autoRole);
            if (role) {
              setCurrentAutoRole(role);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update currentAutoRole when settings or guildData changes
  useEffect(() => {
    if (settings.autoRole && guildData.roles.length > 0) {
      const role = guildData.roles.find(r => r.id === settings.autoRole);
      if (role) {
        setCurrentAutoRole(role);
      }
    } else {
      setCurrentAutoRole(null);
    }
  }, [settings.autoRole, guildData.roles]);

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
        <section className="glass rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 space-y-6">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Automation
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Auto-Role</label>
              
              {/* Show current auto-role status */}
              {currentAutoRole && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm text-emerald-400 font-medium">
                    Currently active: <span className="text-white font-bold" style={{ color: currentAutoRole.color || '#fff' }}>{currentAutoRole.name || 'Unknown Role'}</span>
                  </span>
                </div>
              )}
              
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
