import { useEffect, useState } from 'react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/audit-logs', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-white">Loading audit logs...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight">Audit <span className="gradient-text">Logs</span></h1>
        <p className="text-slate-400 mt-1">Track all administrative actions performed on the server.</p>
      </header>

      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="glass rounded-2xl p-6 border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <div>
                <p className="text-white font-bold">
                  <span className="text-indigo-400">{log.executor}</span> performed <span className="text-slate-300">{log.action}</span>
                </p>
                <p className="text-slate-500 text-sm">Target: {log.target} &bull; {log.timestamp}</p>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all"></div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="py-20 text-center glass rounded-3xl border border-dashed border-white/10">
            <p className="text-slate-500 font-medium">No audit logs found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
