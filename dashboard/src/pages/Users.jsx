import { useEffect, useState, useCallback } from 'react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [modAction, setModAction] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchUsers = useCallback((page = 1, search = '') => {
    setLoading(true);
    const url = `/api/dashboard/users?page=${page}&limit=40&search=${encodeURIComponent(search)}`;
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers(1, searchTerm);
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchUsers]);

  const handleModerate = async () => {
    if (!modAction || !reason) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/dashboard/users/${modAction.user.id}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: modAction.type, reason })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `Successfully ${modAction.type}ed ${modAction.user.username}` });
        setModAction(null);
        setReason('');
        if (modAction.type !== 'warn') fetchUsers(pagination.page, searchTerm);
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setProcessing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  if (loading && users.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">User <span className="gradient-text">Management</span></h1>
          <p className="text-slate-400 mt-1">Monitor community members and invite statistics ({pagination.total} total).</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="bg-slate-800/50 border border-white/10 rounded-2xl px-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full md:w-80 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </header>

      {message.text && (
        <div className={`p-4 rounded-2xl border animate-in slide-in-from-top duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-5">User</th>
                <th className="px-8 py-5">Discord ID</th>
                <th className="px-8 py-5">Invites</th>
                <th className="px-8 py-5">Joined</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img 
                          src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                          alt="" 
                          className="w-10 h-10 rounded-full border border-white/10 bg-slate-800" 
                          onError={(e) => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                        />
                        <span className="text-white font-bold group-hover:text-indigo-400 transition-colors">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-400 font-mono text-sm">{user.id}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                        user.invites > 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : user.invites < 0 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {user.invites > 0 ? `+${user.invites}` : user.invites}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-slate-400 text-sm">{user.joinedAt}</td>
                    <td className="px-8 py-5 text-right relative">
                      <button 
                        onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                        className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </button>
                      
                      {selectedUser === user.id && (
                        <div className="absolute right-8 top-12 w-48 glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                          <div className="p-2 space-y-1">
                            <button onClick={() => { setModAction({ type: 'warn', user }); setSelectedUser(null); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-amber-400 hover:bg-amber-400/10 transition-all flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Warn User
                            </button>
                            <button onClick={() => { setModAction({ type: 'mute', user }); setSelectedUser(null); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-indigo-400 hover:bg-indigo-400/10 transition-all flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                              Mute User
                            </button>
                            <button onClick={() => { setModAction({ type: 'kick', user }); setSelectedUser(null); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-orange-400 hover:bg-orange-400/10 transition-all flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                              Kick User
                            </button>
                            <button onClick={() => { setModAction({ type: 'ban', user }); setSelectedUser(null); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-400/10 transition-all flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              Ban User
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-slate-500 font-medium">
                    {loading ? 'Loading users...' : (searchTerm ? `No users found matching "${searchTerm}"` : 'No members found in this server.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-8 py-5 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="text-white font-bold">{Math.min((pagination.page - 1) * 40 + 1, pagination.total)} - {Math.min(pagination.page * 40, pagination.total)}</span> of <span className="text-white font-bold">{pagination.total}</span> members
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchUsers(pagination.page - 1, searchTerm)}
              disabled={!pagination.hasPrev || loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Previous
            </button>
            <div className="px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-sm font-bold">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <button 
              onClick={() => fetchUsers(pagination.page + 1, searchTerm)}
              disabled={!pagination.hasNext || loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Moderation Modal */}
      {modAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-xl font-bold text-white capitalize">{modAction.type} User</h2>
              <button onClick={() => setModAction(null)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <img src={modAction.user.avatar} alt="" className="w-12 h-12 rounded-full border border-white/10" />
                <div>
                  <p className="text-white font-bold">{modAction.user.username}</p>
                  <p className="text-xs text-slate-500 font-mono">{modAction.user.id}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Reason for {modAction.type}</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all h-32 resize-none"
                  placeholder={`Enter a professional reason for this ${modAction.type}...`}
                />
              </div>
              <button 
                onClick={handleModerate}
                disabled={processing || !reason}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                  modAction.type === 'ban' ? 'bg-red-600 hover:bg-red-500' : 
                  modAction.type === 'kick' ? 'bg-orange-600 hover:bg-orange-500' :
                  modAction.type === 'mute' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-amber-600 hover:bg-amber-500'
                } ${processing || !reason ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
              >
                {processing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Confirm {modAction.type}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {selectedUser && (
        <div className="fixed inset-0 z-40" onClick={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
