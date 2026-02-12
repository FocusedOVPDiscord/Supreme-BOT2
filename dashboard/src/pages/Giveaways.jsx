import { useEffect, useState } from 'react';

export default function Giveaways() {
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchGiveaways();
  }, []);

  const fetchGiveaways = async () => {
    try {
      const response = await fetch('/api/dashboard/giveaways', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setGiveaways(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch giveaways:', error);
    } finally {
      setLoading(false);
    }
  };

  const endGiveaway = async (id) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/dashboard/giveaways/${id}/end`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        showToast('Giveaway ended successfully');
        fetchGiveaways();
      } else {
        showToast('Failed to end giveaway', 'error');
      }
    } catch (error) {
      showToast('Failed to end giveaway', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteGiveaway = async (id) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/dashboard/giveaways/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setGiveaways(prev => prev.filter(g => g.id !== id));
        showToast('Giveaway deleted successfully');
      } else {
        showToast('Failed to delete giveaway', 'error');
      }
    } catch (error) {
      showToast('Failed to delete giveaway', 'error');
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const formatTimeLeft = (endTime) => {
    if (!endTime) return 'Unknown';
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    if (diff <= 0) return 'Ended';
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    if (d > 0) return `${d}d ${h}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass rounded-2xl p-6 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-2/3"></div>
                  <div className="h-3 bg-white/10 rounded w-1/3"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-white/5 rounded-xl"></div>
                <div className="h-16 bg-white/5 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeGiveaways = giveaways.filter(g => g.status === 'active');
  const endedGiveaways = giveaways.filter(g => g.status !== 'active');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-bold shadow-2xl toast-enter ${
          toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="glass rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Giveaway?</h3>
            <p className="text-sm text-slate-400 mb-6">This will delete the giveaway message and all its data permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors text-white">Cancel</button>
              <button onClick={() => deleteGiveaway(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold border border-red-500/20 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Server <span className="gradient-text">Giveaways</span></h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Monitor and manage all giveaways from one place.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-4 py-2 glass rounded-xl text-sm font-bold text-emerald-400">
            {activeGiveaways.length} Active
          </span>
          <span className="px-4 py-2 glass rounded-xl text-sm font-bold text-slate-400">
            {endedGiveaways.length} Ended
          </span>
          <button onClick={fetchGiveaways} className="p-2 hover:bg-white/5 rounded-xl transition-colors" title="Refresh">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {giveaways.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl">
          <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 text-4xl">
            🎉
          </div>
          <p className="text-lg font-bold text-slate-400">No giveaways found</p>
          <p className="text-sm text-slate-500 mt-1">Create one using <code className="px-2 py-0.5 bg-white/5 rounded text-indigo-400">/giveaway-create</code> in Discord</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Giveaways */}
          {activeGiveaways.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 status-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                Active Giveaways
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {activeGiveaways.map(giveaway => (
                  <GiveawayCard 
                    key={giveaway.id} 
                    giveaway={giveaway} 
                    formatTimeLeft={formatTimeLeft}
                    onEnd={endGiveaway}
                    onDelete={(id) => setDeleteConfirm(id)}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ended Giveaways */}
          {endedGiveaways.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                Ended Giveaways
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {endedGiveaways.map(giveaway => (
                  <GiveawayCard 
                    key={giveaway.id} 
                    giveaway={giveaway} 
                    formatTimeLeft={formatTimeLeft}
                    onEnd={endGiveaway}
                    onDelete={(id) => setDeleteConfirm(id)}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GiveawayCard({ giveaway, formatTimeLeft, onEnd, onDelete, actionLoading }) {
  const isActive = giveaway.status === 'active';
  const isLoading = actionLoading === giveaway.id;

  return (
    <div className={`glass rounded-2xl md:rounded-3xl p-5 md:p-6 border transition-all card-hover ${
      isActive ? 'border-indigo-500/20 hover:border-indigo-500/40' : 'border-white/5 opacity-80'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
            isActive ? 'bg-purple-500/10' : 'bg-slate-700/50'
          }`}>
            🎁
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-bold truncate">{giveaway.prize}</h3>
            <p className="text-xs text-slate-500">Hosted by {giveaway.hostTag}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ml-2 ${
          isActive 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-slate-700/50 text-slate-400 border border-slate-600/20'
        }`}>
          {isActive ? formatTimeLeft(giveaway.endTime) : 'Ended'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{giveaway.participants}</p>
          <p className="text-xs text-slate-500">Participants</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{giveaway.winnersCount}</p>
          <p className="text-xs text-slate-500">{giveaway.winnersCount === 1 ? 'Winner' : 'Winners'}</p>
        </div>
      </div>

      {/* End Time */}
      {giveaway.endTime && (
        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {isActive ? 'Ends' : 'Ended'}: {new Date(giveaway.endTime * 1000).toLocaleString()}
        </p>
      )}

      {/* Winners display for ended giveaways */}
      {!isActive && giveaway.winners && giveaway.winners.length > 0 && (
        <div className="mb-4 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
          <p className="text-xs text-amber-400 font-bold mb-1">Winners</p>
          <p className="text-xs text-slate-300">{giveaway.winners.map(id => id).join(', ')}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isActive && (
          <button 
            onClick={() => onEnd(giveaway.id)}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-bold border border-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                Ending...
              </span>
            ) : 'End Now'}
          </button>
        )}
        <button 
          onClick={() => onDelete(giveaway.id)}
          disabled={isLoading}
          className={`${isActive ? '' : 'flex-1'} py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isActive ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          ) : 'Delete'}
        </button>
      </div>
    </div>
  );
}
