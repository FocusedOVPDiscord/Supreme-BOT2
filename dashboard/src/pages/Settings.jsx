import { useEffect, useState } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/settings', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-white">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight">Bot <span className="gradient-text">Settings</span></h1>
        <p className="text-slate-400 mt-1">Configure core bot functionality and automation.</p>
      </header>

      <div className="space-y-6">
        <section className="glass rounded-3xl p-8 border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Automation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Auto-Role ID</label>
              <input 
                type="text" 
                value={settings?.autoRole || ''} 
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                placeholder="Enter Role ID"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Welcome Channel</label>
              <input 
                type="text" 
                value={settings?.welcomeChannel || ''} 
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                placeholder="Enter Channel ID"
              />
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-8 border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
            Ticket System
          </h2>
          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-bold">Ticket Category</p>
                <p className="text-slate-500 text-sm">All new tickets will be created under this category.</p>
              </div>
              <span className="text-indigo-400 font-mono font-bold">{settings?.ticketCategory}</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button className="px-10 py-4 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
