import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function AI() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState({ totalMessages: 0, uniqueUsers: 0 });
  const [memory, setMemory] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchAIStatus();
    fetchMemory();
    fetchUsers();
  }, []);

  const fetchAIStatus = async () => {
    try {
      const response = await fetch('/api/ai/status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemory = async () => {
    try {
      const response = await fetch('/api/ai/memory?limit=50', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setMemory(data);
      }
    } catch (error) {
      console.error('Failed to fetch memory:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/ai/users', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const response = await fetch('/api/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !enabled })
      });

      if (response.ok) {
        const data = await response.json();
        setEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Failed to toggle AI:', error);
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    if (!confirm('Delete this memory entry?')) return;

    try {
      const response = await fetch(`/api/ai/memory/${memoryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setMemory(memory.filter(m => m.id !== memoryId));
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const handleClearUserMemory = async (userId) => {
    if (!confirm('Clear all memory for this user? This cannot be undone!')) return;

    try {
      const response = await fetch('/api/ai/memory/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        setMemory(memory.filter(m => m.userId !== userId));
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to clear memory:', error);
    }
  };

  if (loading) return <div className="p-4 md:p-8 text-white">Loading AI system...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            AI <span className="gradient-text">Ticket Bot</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">
            Powered by GPT-4.1 • Free & Unlimited
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`px-6 py-3 rounded-2xl font-bold transition-all ${
            enabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {toggling ? 'Updating...' : enabled ? '✅ AI Enabled' : '❌ AI Disabled'}
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">
              💬
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Messages</p>
              <p className="text-3xl font-black text-white">{stats.totalMessages.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-3xl">
              👥
            </div>
            <div>
              <p className="text-slate-400 text-sm">Unique Users</p>
              <p className="text-3xl font-black text-white">{stats.uniqueUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-3xl">
              🤖
            </div>
            <div>
              <p className="text-slate-400 text-sm">Status</p>
              <p className="text-2xl font-black text-white">{enabled ? 'Online' : 'Offline'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === 'overview'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === 'memory'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🧠 Memory
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === 'users'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          👤 Users
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
          <h2 className="text-2xl font-bold text-white">How It Works</h2>
          <div className="space-y-4 text-slate-300">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-bold text-white">Auto-Response in Tickets</p>
                <p className="text-sm text-slate-400">AI automatically responds to user messages in ticket channels</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💾</span>
              <div>
                <p className="font-bold text-white">Persistent Memory</p>
                <p className="text-sm text-slate-400">Conversation history is saved to database for context</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="font-bold text-white">Safety Filters</p>
                <p className="text-sm text-slate-400">Automatically declines dangerous or inappropriate requests</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-bold text-white">Powered by GPT-4.1</p>
                <p className="text-sm text-slate-400">Free, unlimited access via Puter.js</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
            <p className="text-sm text-indigo-300">
              <strong>Commands:</strong> Users can use <code className="bg-black/30 px-2 py-1 rounded">/ai</code> to chat with AI, 
              <code className="bg-black/30 px-2 py-1 rounded ml-1">/ai-memory</code> to view history, 
              and staff can use <code className="bg-black/30 px-2 py-1 rounded ml-1">/toggle-ai</code> to enable/disable.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="space-y-4">
          {memory.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center border border-white/5">
              <p className="text-6xl mb-4">🧠</p>
              <p className="text-xl font-bold text-white mb-2">No Memory Yet</p>
              <p className="text-slate-400">AI conversations will appear here</p>
            </div>
          ) : (
            memory.map((entry) => (
              <div key={entry.id} className="glass rounded-2xl p-4 md:p-6 border border-white/5 hover:border-indigo-500/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{entry.role === 'user' ? '👤' : '🤖'}</span>
                      <span className="font-bold text-white capitalize">{entry.role}</span>
                      <span className="text-xs text-slate-500">ID: {entry.id}</span>
                    </div>
                    <p className="text-slate-300 text-sm md:text-base">{entry.content}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(entry.id)}
                    className="p-2 hover:bg-red-500/20 rounded-xl transition-colors text-red-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          {users.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center border border-white/5">
              <p className="text-6xl mb-4">👥</p>
              <p className="text-xl font-bold text-white mb-2">No Users Yet</p>
              <p className="text-slate-400">Users who interact with AI will appear here</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.userId} className="glass rounded-2xl p-4 md:p-6 border border-white/5 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                      alt={user.username}
                      className="w-12 h-12 rounded-full border-2 border-indigo-500/30"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-white">{user.username}</p>
                      <p className="text-sm text-slate-400">
                        {user.messageCount} messages • Last: {new Date(user.lastInteraction).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearUserMemory(user.userId)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors font-bold text-sm"
                  >
                    Clear Memory
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
