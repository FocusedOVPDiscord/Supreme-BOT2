import { useEffect, useState } from 'react';

export default function Giveaways() {
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/giveaways', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setGiveaways(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-white">Loading giveaways...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Active <span className="gradient-text">Giveaways</span></h1>
          <p className="text-slate-400 mt-1">Monitor and manage ongoing community events.</p>
        </div>
        <button className="px-6 py-3 rounded-2xl gradient-bg text-white font-bold shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all">
          Create New
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {giveaways.map(gw => (
          <div key={gw.id} className="glass rounded-3xl p-8 border border-white/5 flex items-center justify-between group">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Giveaway #{gw.id}</h3>
                <p className="text-slate-400 font-medium">{gw.participants} Participants</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase">
                {gw.status}
              </span>
              <button className="text-slate-500 hover:text-red-400 transition-colors text-sm font-bold">End Early</button>
            </div>
          </div>
        ))}
        {giveaways.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-3xl border border-dashed border-white/10">
            <p className="text-slate-500 font-medium">No active giveaways found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
