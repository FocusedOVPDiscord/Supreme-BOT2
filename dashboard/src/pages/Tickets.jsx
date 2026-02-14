import { useEffect, useState } from 'react';
import Toast from '../components/Toast';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchTickets = () => {
    setLoading(true);
    fetch('/api/dashboard/tickets', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const viewChat = async (ticket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const response = await fetch(`/api/dashboard/tickets/${ticket.id}/messages`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to delete this ticket? This will delete the channel from Discord.')) return;
    
    setDeletingId(ticketId);
    try {
      const response = await fetch(`/api/dashboard/tickets/${ticketId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setTickets(tickets.filter(t => t.id !== ticketId));
      } else {
        setToast({ message: 'Failed to delete ticket', type: 'error' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast({ message: 'An error occurred while deleting the ticket', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading tickets...</div>;

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Active <span className="gradient-text">Tickets</span></h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Manage and respond to community support requests.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {tickets.map(ticket => (
          <div key={ticket.id} className="glass rounded-3xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" /></svg>
              </div>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase">
                {ticket.status}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">Ticket #{ticket.ticketNumber}</h3>
            <p className="text-slate-500 text-sm mb-4">Created by <span className="text-slate-300 font-medium">{ticket.user}</span> on {new Date(ticket.created).toLocaleDateString()}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => viewChat(ticket)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
              >
                View Chat
              </button>
              <button 
                onClick={() => deleteTicket(ticket.id)}
                disabled={deletingId === ticket.id}
                className={`px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all ${deletingId === ticket.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {deletingId === ticket.id ? (
                  <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                )}
              </button>
            </div>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-3xl border border-dashed border-white/10">
            <p className="text-slate-500 font-medium">No active tickets found.</p>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl w-full max-w-3xl max-h-[85vh] md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-white">Ticket #{selectedTicket.ticketNumber}</h2>
                <p className="text-xs text-slate-400 font-mono">Channel ID: {selectedTicket.id}</p>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-900/50">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 font-medium">Loading messages...</p>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.author.bot ? 'opacity-80' : ''}`}>
                    <img src={msg.author.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10 flex-shrink-0" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${msg.author.bot ? 'text-indigo-400' : 'text-white'}`}>
                          {msg.author.username}
                        </span>
                        {msg.author.bot && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase">Bot</span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-300 text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-all">
                              <img src={url} alt="Attachment" className="max-w-[200px] max-h-[200px] object-contain bg-black/20" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-500">No messages found in this ticket.</div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/5 bg-white/5">
              <p className="text-xs text-slate-500 text-center italic">This is a read-only view of the ticket history.</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
