import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

export default function ServerSelection({ setSelectedGuild, user }) {
  const [guilds, setGuilds] = useState([]);
  const [botInviteUrl, setBotInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    try {
      const response = await fetch('/api/dashboard/guilds', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuilds(data.guilds || []);
        setBotInviteUrl(data.botInviteUrl || '');
      } else if (response.status === 401) {
        navigate('/dashboard/login');
      } else {
        setToast({ message: 'Failed to fetch servers', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
      setToast({ message: 'Failed to fetch servers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuild = async (guild) => {
    if (!guild.botInGuild) {
      // Open invite link in new tab
      window.open(`${botInviteUrl}&guild_id=${guild.id}`, '_blank');
      setToast({ 
        message: 'Please add the bot to your server, then refresh this page', 
        type: 'info' 
      });
      return;
    }

    try {
      const response = await fetch('/api/dashboard/select-guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: guild.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedGuild(data.guild);
        navigate('/dashboard');
      } else {
        const error = await response.json();
        setToast({ message: error.error || 'Failed to select server', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to select guild:', error);
      setToast({ message: 'Failed to select server', type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Clear local state
        setSelectedGuild(null);
        // Force reload to clear all state
        window.location.href = '/dashboard/login';
      } else {
        setLoading(false);
        setToast({ message: 'Logout failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
      setToast({ message: 'Logout failed. Please try again.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your servers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="min-h-screen bg-[#0f172a] relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg shadow-2xl shadow-indigo-500/40 mb-4">
              <span className="text-3xl font-black text-white">S</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-2">
              Select a <span className="gradient-text">Server</span>
            </h1>
            <p className="text-slate-400">Choose which server you want to manage</p>
          </div>

          {/* User Info */}
          {user && (
            <div className="max-w-md mx-auto mb-8 glass rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                    {user.username.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{user.username}</p>
                  <p className="text-slate-500 text-xs">Logged in</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Logout
              </button>
            </div>
          )}

          {/* Server Grid */}
          {guilds.length === 0 ? (
            <div className="max-w-md mx-auto glass rounded-2xl p-8 border border-white/10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Servers Found</h3>
              <p className="text-slate-400 text-sm mb-6">
                You don't have Administrator or Manage Server permissions in any servers.
              </p>
              <button
                onClick={handleLogout}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
              >
                Try Another Account
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {guilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => handleSelectGuild(guild)}
                    className={`glass rounded-2xl p-6 border transition-all hover:scale-105 ${
                      guild.botInGuild
                        ? 'border-white/10 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/20'
                        : 'border-amber-500/30 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/20'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      {guild.icon ? (
                        <img
                          src={guild.icon}
                          alt={guild.name}
                          className="w-20 h-20 rounded-full mb-4"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-2xl mb-4">
                          {guild.name.charAt(0)}
                        </div>
                      )}
                      
                      <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                        {guild.name}
                      </h3>
                      
                      {guild.botInGuild ? (
                        <>
                          {guild.memberCount && (
                            <p className="text-slate-400 text-sm mb-3">
                              {guild.memberCount.toLocaleString()} members
                            </p>
                          )}
                          <div className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold">
                            Manage Server
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-amber-400 text-sm mb-3">
                            ⚠️ Bot not added
                          </p>
                          <div className="px-4 py-2 rounded-lg bg-amber-600/20 text-amber-400 text-xs font-bold">
                            Add Bot to Server
                          </div>
                        </>
                      )}
                      
                      {guild.owner && (
                        <div className="mt-3 px-2 py-1 rounded-md bg-yellow-600/20 text-yellow-400 text-xs font-bold">
                          👑 Owner
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-8 glass rounded-2xl p-6 border border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black text-white">{guilds.length}</p>
                    <p className="text-slate-400 text-xs">Total Servers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-indigo-400">
                      {guilds.filter(g => g.botInGuild).length}
                    </p>
                    <p className="text-slate-400 text-xs">With Bot</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-400">
                      {guilds.filter(g => !g.botInGuild).length}
                    </p>
                    <p className="text-slate-400 text-xs">Need Bot</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
