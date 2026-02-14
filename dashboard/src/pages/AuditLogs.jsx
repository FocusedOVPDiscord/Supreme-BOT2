import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ACTION_COLORS = {
  'Member Banned': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Member Kicked': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Member Unbanned': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Channel Created': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Channel Deleted': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Channel Updated': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Role Created': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Role Deleted': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Role Updated': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Message Deleted': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Messages Bulk Deleted': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Member Updated': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Server Updated': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const DEFAULT_COLOR = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/dashboard/audit-logs', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.action === filter);

  const formatTimestamp = (ts) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      return date.toLocaleDateString();
    } catch {
      return ts;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 animate-fade-in">
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3"></div>
                  <div className="h-3 bg-white/10 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Audit <span className="gradient-text">Logs</span></h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Track all administrative actions on the server.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none pr-10"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <button onClick={fetchLogs} className="p-2 hover:bg-white/5 rounded-xl transition-colors" title="Refresh">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {/* Logs */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <p className="text-lg font-bold text-slate-400">No audit logs found</p>
          <p className="text-sm text-slate-500 mt-1">{filter !== 'all' ? 'Try a different filter' : 'No recent actions to display'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map(log => {
            const colorClass = ACTION_COLORS[log.action] || DEFAULT_COLOR;
            return (
              <div key={log.id} className="glass rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 group hover:bg-white/[0.03] transition-all">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Avatar or icon */}
                  {log.executorAvatar ? (
                    <img src={log.executorAvatar} alt="" className="w-10 h-10 rounded-xl flex-shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      <span className="font-bold text-indigo-400">{log.executor}</span>
                      <span className="text-slate-400 mx-1.5">performed</span>
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold border ${colorClass}`}>{log.action}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Target: <span className="text-slate-400">{log.target}</span>
                      {log.reason && <span className="ml-2 text-slate-500">- {log.reason}</span>}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 self-start sm:self-center">{formatTimestamp(log.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-slate-600 text-center">
        Showing {filteredLogs.length} of {logs.length} entries
      </p>
    </div>
  );
}
