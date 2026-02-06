import { useEffect, useState } from 'react';

export default function ServerSelector({ selectedGuild, onGuildChange }) {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const response = await fetch('/api/dashboard/guilds', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setGuilds(data);
          
          // AUTO-SELECTION REMOVED: 
          // We no longer automatically call handleSelectGuild here.
          // The user must manually select a guild from the dropdown.
        }
      } catch (error) {
        console.error('Failed to fetch guilds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuilds();
  }, []); // Only fetch guilds once on mount

  const handleSelectGuild = async (guild) => {
    try {
      const response = await fetch('/api/dashboard/select-guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: guild.id }),
      });

      if (response.ok) {
        // Update parent state with the selected guild
        onGuildChange(guild);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to select guild:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10"></div>
        <div className="flex-1 h-4 bg-white/10 rounded"></div>
      </div>
    );
  }

  // If no guilds available, show a message
  if (guilds.length === 0) {
    return (
      <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
        No servers found
      </div>
    );
  }

  // If no guild is selected yet, show a placeholder
  const currentGuild = selectedGuild;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all group border ${
          currentGuild 
            ? 'bg-white/5 hover:bg-white/10 border-white/10' 
            : 'bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
        }`}
      >
        {currentGuild ? (
          <>
            {currentGuild.icon ? (
              <img
                src={currentGuild.icon}
                alt={currentGuild.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                {currentGuild.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-white truncate">{currentGuild.name}</p>
              <p className="text-xs text-slate-500">{currentGuild.memberCount.toLocaleString()} members</p>
            </div>
          </>
        ) : (
          <div className="flex-1 text-left flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm font-bold text-indigo-400">Select a Server</p>
          </div>
        )}
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {guilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => handleSelectGuild(guild)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all ${
                  currentGuild?.id === guild.id
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {guild.icon ? (
                  <img
                    src={guild.icon}
                    alt={guild.name}
                    className="w-7 h-7 rounded-full"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold truncate">{guild.name}</p>
                  <p className="text-xs text-slate-500">{guild.memberCount.toLocaleString()} members</p>
                </div>
                {currentGuild?.id === guild.id && (
                  <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
