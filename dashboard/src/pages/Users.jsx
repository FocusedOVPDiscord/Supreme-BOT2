import { useEffect, useState } from 'react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/dashboard/users', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.id.includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-white">Loading users...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">User <span className="gradient-text">Management</span></h1>
          <p className="text-slate-400 mt-1">Monitor community members and invite statistics.</p>
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

      <div className="glass rounded-3xl overflow-hidden border border-white/5">
        <table className="w-full text-left border-collapse">
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
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                    <span className="text-white font-bold group-hover:text-indigo-400 transition-colors">{user.username}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-slate-400 font-mono text-sm">{user.id}</td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                    {user.invites}
                  </span>
                </td>
                <td className="px-8 py-5 text-slate-400 text-sm">{user.joinedAt}</td>
                <td className="px-8 py-5 text-right">
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
