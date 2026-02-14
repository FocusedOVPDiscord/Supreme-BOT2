import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function WelcomeSetup() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [config, setConfig] = useState({
    enabled: false,
    channelId: '',
    title: '',
    description: '',
    bannerUrl: '',
  });

  useEffect(() => {
    fetchConfig();
    fetchChannels();
  }, [guildId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/welcome/${guildId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch welcome config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch(`/api/welcome/${guildId}/channels`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleSave = async () => {
    if (config.enabled && !config.channelId) {
      alert('Please select a channel to send welcome messages to');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/welcome/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Welcome configuration saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save welcome config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const replaceVariables = (text) => {
    return text
      .replace(/{username}/g, '@FocusedOVP')
      .replace(/{serverName}/g, 'Supreme ! MM')
      .replace(/{user}/g, '@FocusedOVP');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Message Setup</h1>
        <p className="text-slate-400">Configure automatic welcome messages for new members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Configuration */}
        <div className="space-y-6">
          {/* Message Customization Card */}
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Message Customization</h2>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Show Variables
              </button>
            </div>

            {/* Channel Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Channel to send the welcome messages to
              </label>
              <select
                value={config.channelId}
                onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
              </select>
              {config.enabled && !config.channelId && (
                <p className="text-red-400 text-sm mt-2">You must pick a channel to send welcome messages to</p>
              )}
            </div>

            {/* Welcome Enabled Toggle */}
            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-slate-700'}`}>
                    <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-5' : ''}`}></div>
                  </div>
                </div>
                <span className="ml-3 text-sm font-medium text-slate-300">Welcome enabled</span>
              </label>
            </div>

            {/* Bot Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Supreme bot
              </label>
              <div className="flex items-center gap-3 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
                  S
                </div>
                <span className="text-white font-medium">Supreme Bot</span>
              </div>
            </div>

            {/* Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Welcome {'{username}'}
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Welcome {username}"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Welcome {'{user}'} to **{'{serverName}'}**
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Step 1 - Read rules...\nStep 2 - Reach out..."
                rows={6}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Banner URL Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Banner Image/GIF URL (optional)
              </label>
              <input
                type="text"
                value={config.bannerUrl}
                onChange={(e) => setConfig({ ...config, bannerUrl: e.target.value })}
                placeholder="https://example.com/banner.gif"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-bg hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side - Preview */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/10 sticky top-6">
            <h2 className="text-xl font-bold text-white mb-4">Embed Preview</h2>
            <p className="text-sm text-slate-400 mb-6">
              This is a non-functional example of how the embed will appear in Discord. Buttons and dropdowns will not work in this preview.
            </p>

            {/* Discord-style preview */}
            <div className="bg-[#313338] rounded-lg p-4">
              {/* Bot header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
                  S
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">Supreme Bot</span>
                    <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">APP</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Welcome message content */}
              <div className="mb-3">
                <span className="text-white">@FocusedOVP Welcome To Supreme ! MM</span>
              </div>

              {/* Embed */}
              <div className="border-l-4 border-green-500 bg-[#2b2d31] rounded p-4">
                {config.title && (
                  <div className="text-white font-semibold mb-2">
                    {replaceVariables(config.title)}
                  </div>
                )}
                {config.description && (
                  <div className="text-slate-300 text-sm mb-3 whitespace-pre-wrap">
                    {replaceVariables(config.description)}
                    {'\n\n'}
                    <strong>Invited by:</strong> @Inviter
                  </div>
                )}
                {config.bannerUrl && (
                  <img
                    src={config.bannerUrl}
                    alt="Welcome banner"
                    className="rounded mt-3 max-w-full"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <div className="w-5 h-5 rounded-full bg-slate-700"></div>
                  <span className="text-xs text-slate-400">Thank you for choosing Supreme ! MM!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
