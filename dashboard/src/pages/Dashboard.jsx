import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include',
        });
        
        if (response.status === 500 || response.status === 404) {
          // This usually means no guild is selected in the session yet
          setStats(null);
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // If no stats and no error, it means no guild is selected
  if (!stats && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-3xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10 border border-indigo-500/20">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-7-4h.01M12 16h.01" />
          </svg>
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tight">Welcome to <span className="gradient-text">Supreme Dashboard</span></h2>
          <p className="text-slate-400">Please select a server from the sidebar to view its statistics and manage its settings.</p>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 font-bold animate-bounce mt-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Select a server to begin</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">System <span className="gradient-text">Overview</span></h1>
          <p className="text-slate-400 mt-1">Real-time performance and community metrics for <strong>{stats?.serverName}</strong>.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
          <div className="px-4 py-2 rounded-xl bg-indigo-600/10 text-indigo-400 text-sm font-bold border border-indigo-500/20">
            v2.4.0 Stable
          </div>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-sm font-bold text-slate-300">Live</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={stats?.totalMembers?.toLocaleString() || 0}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          color="from-blue-600/20 to-indigo-600/20"
          borderColor="border-blue-500/30"
          textColor="text-blue-400"
        />
        <StatCard
          title="Active Tickets"
          value={stats?.activeTickets || 0}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>}
          color="from-emerald-600/20 to-teal-600/20"
          borderColor="border-emerald-500/30"
          textColor="text-emerald-400"
        />
        <StatCard
          title="Closed Tickets"
          value={stats?.closedTickets || 0}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
          color="from-purple-600/20 to-pink-600/20"
          borderColor="border-purple-500/30"
          textColor="text-purple-400"
        />
        <StatCard
          title="Bot Uptime"
          value={stats?.uptime ? formatUptime(stats.uptime) : 'N/A'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="from-orange-600/20 to-amber-600/20"
          borderColor="border-orange-500/30"
          textColor="text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Server Info */}
        <div className="lg:col-span-1 glass rounded-3xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Server Details
          </h2>
          <div className="space-y-4">
            <InfoRow label="Server Name" value={stats?.serverName || 'N/A'} />
            <InfoRow label="Total Channels" value={stats?.channels || 0} />
            <InfoRow label="Total Roles" value={stats?.roles || 0} />
            <InfoRow label="Bot Status" value={stats?.botStatus || 'Offline'} isStatus />
          </div>
          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="lg:col-span-2 glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Recent Activity
            </h2>
            <button className="text-sm text-indigo-400 font-bold hover:text-indigo-300 transition-colors">View All</button>
          </div>
          
          <div className="space-y-4">
            {stats?.recentTickets?.length > 0 ? (
              stats.recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-bold group-hover:text-indigo-400 transition-colors">{ticket.title}</p>
                      <p className="text-xs text-slate-500">Ticket #{ticket.id.slice(-4)}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wider">
                    {ticket.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3">
                <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-2.586 2.586a2 2 0 01-2.828 0L12 14l-2.586 2.586a2 2 0 01-2.828 0L4 13" /></svg>
                <p className="font-medium">No recent activity to display</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, borderColor, textColor }) {
  return (
    <div className={`glass rounded-3xl p-6 border-l-4 ${borderColor} hover:translate-y-[-4px] transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center ${textColor} shadow-lg`}>
          {icon}
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, isStatus }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      {isStatus ? (
        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          {value}
        </span>
      ) : (
        <span className="text-white font-bold text-sm">{value}</span>
      )}
    </div>
  );
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}
