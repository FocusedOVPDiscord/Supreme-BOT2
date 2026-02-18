import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function TicketSetup({ selectedGuild }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Embed fields
  const [embedTitle, setEmbedTitle] = useState('💸 Middleman Tickets');
  const [embedDescription, setEmbedDescription] = useState(
    '📌 **Important**\n' +
    'Only open a ticket when both trading parties have agreed to use a SM MM.\n' +
    'Repeated misuse or spam tickets may lead to temporary or permanent restrictions.\n\n' +
    '⚠️ **Ticket Policy & Requirements**\n' +
    '• SM provides a structured, documented process – not a guarantee, insurance, or refund service.\n' +
    '• All protection applies only to trades handled inside official SM tickets with verified staff.\n' +
    '• Trades in DMs, group chats, or other servers are 100% at your own risk.\n' +
    '• Staff may delay, decline, or cancel any trade that fails verification or looks unsafe.\n' +
    '• Do not send items, accounts, or payments until a SM staff member clearly confirms both sides and tells you when to start.\n\n' +
    '💸 **Here is the SM server\'s official MM tipping policy (Mandatory)**\n' +
    '**Item for Item trades 🏷️:**\n' +
    '• FREE for everyone no matter how big the trade, or how small either.\n' +
    '**Item For Money trades 💸:**\n' +
    '• Tax Included Depends On The Trade'
  );
  const [embedColor, setEmbedColor] = useState('#00FF00');
  const [embedImage, setEmbedImage] = useState('https://cdn.discordapp.com/attachments/1354437993024454817/1461387048639266899/banner.gif');
  const [buttonLabel, setButtonLabel] = useState('Create Middleman Ticket');
  const [buttonEmoji, setButtonEmoji] = useState('🤝');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [ticketCategory, setTicketCategory] = useState('');

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/dashboard/channels', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.filter(ch => ch.type === 0)); // Text channels
        setCategories(data.filter(ch => ch.type === 4)); // Categories
      }
    } catch (e) {
      console.error('Failed to fetch channels:', e);
    }
  };

  const handleDeploy = async () => {
    if (!selectedChannel) {
      setError('Please select a channel to deploy the ticket panel');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/dashboard/ticket-setup/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: selectedChannel,
          ticketCategoryId: ticketCategory,
          embed: {
            title: embedTitle,
            description: embedDescription,
            color: embedColor,
            image: embedImage
          },
          button: {
            label: buttonLabel,
            emoji: buttonEmoji
          }
        })
      });

      if (res.ok) {
        setSuccess('Ticket panel deployed successfully!');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to deploy ticket panel');
      }
    } catch (e) {
      setError('Failed to deploy ticket panel');
    } finally {
      setSaving(false);
    }
  };

  // Parse markdown-like formatting for preview
  const formatPreviewText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-indigo-400">Ticket</span> Setup
        </h1>
        <p className="text-slate-400">Configure and deploy your ticket panel with a live embed preview.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Channel Selection */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
              Channel Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Deploy Channel</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                >
                  <option value="">Select a channel...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Channel where the ticket panel will be sent</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ticket Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                >
                  <option value="">Select a category...</option>
                  {categories.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Category where new ticket channels will be created</p>
              </div>
            </div>
          </div>

          {/* Embed Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
              Embed Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={embedTitle}
                  onChange={(e) => setEmbedTitle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="Embed title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={embedDescription}
                  onChange={(e) => setEmbedDescription(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none font-mono text-sm"
                  placeholder="Embed description (supports **bold** and markdown)..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Embed Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Banner Image URL</label>
                  <input
                    type="text"
                    value={embedImage}
                    onChange={(e) => setEmbedImage(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Button Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
              Button Configuration
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Button Label</label>
                <input
                  type="text"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Button text..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Button Emoji</label>
                <input
                  type="text"
                  value={buttonEmoji}
                  onChange={(e) => setButtonEmoji(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="🤝"
                />
              </div>
            </div>
          </div>

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            disabled={saving || !selectedChannel}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Deploy Ticket Panel
              </>
            )}
          </button>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Live Preview
          </h2>

          {/* Discord-style embed preview */}
          <div className="bg-[#313338] rounded-lg overflow-hidden">
            {/* Bot message header */}
            <div className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src="/logo.webp" alt="Bot" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">Supreme</span>
                  <span className="bg-[#5865f2] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">BOT</span>
                  <span className="text-[#949ba4] text-xs">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Embed */}
                <div className="mt-1 max-w-[520px]">
                  <div className="flex rounded overflow-hidden bg-[#2b2d31]">
                    {/* Color bar */}
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: embedColor }} />
                    
                    <div className="p-4 flex-1">
                      {/* Author */}
                      <div className="flex items-center gap-2 mb-2">
                        <img src="/logo.webp" alt="" className="w-6 h-6 rounded-full" />
                        <span className="text-white text-sm font-medium">Supreme</span>
                      </div>

                      {/* Title */}
                      {embedTitle && (
                        <h3 className="text-[#00a8fc] font-bold text-base mb-2">{embedTitle}</h3>
                      )}

                      {/* Thumbnail */}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          {/* Description */}
                          <div
                            className="text-[#dbdee1] text-sm leading-relaxed whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: formatPreviewText(embedDescription) }}
                          />
                        </div>
                        <div className="flex-shrink-0">
                          <img src="/logo.webp" alt="" className="w-20 h-20 rounded object-cover" />
                        </div>
                      </div>

                      {/* Image */}
                      {embedImage && (
                        <div className="mt-4 rounded overflow-hidden">
                          <img
                            src={embedImage}
                            alt="Banner"
                            className="w-full max-h-[300px] object-cover rounded"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#949ba4]">
                        <img src="/logo.webp" alt="" className="w-5 h-5 rounded-full" />
                        <span>Supreme Bot</span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Button */}
                <div className="mt-2">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm font-medium rounded transition-colors">
                    {buttonEmoji && <span>{buttonEmoji}</span>}
                    {buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              How It Works
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">1.</span>
                Configure the embed message and button above
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">2.</span>
                Select the channel where the panel will be deployed
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">3.</span>
                Optionally set a ticket category for organizing ticket channels
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">4.</span>
                Click "Deploy Ticket Panel" to send it to Discord
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5">5.</span>
                Users click the button to create a new ticket
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
