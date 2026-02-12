import { useEffect, useState } from 'react';

export default function Transcripts() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/transcripts', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setTranscripts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const parseMessages = (messagesJson) => {
    try {
      return typeof messagesJson === 'string' ? JSON.parse(messagesJson) : messagesJson;
    } catch (e) {
      console.error('Failed to parse messages:', e);
      return [];
    }
  };

  if (loading) return <div className="p-8 text-white">Loading transcripts...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Ticket <span className="gradient-text">Transcripts</span></h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">View history of all closed tickets in the server.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {transcripts.map((transcript, index) => (
          <div key={index} className="glass rounded-3xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <span className="px-3 py-1 rounded-lg bg-slate-500/10 text-slate-400 text-xs font-bold border border-slate-500/20 uppercase">
                Closed
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">Ticket #{transcript.user}</h3>
            <p className="text-slate-500 text-sm mb-4">Closed on {new Date(transcript.closed_at).toLocaleDateString()}</p>
            <button 
              onClick={() => {
                const t = { ...transcript, messages: parseMessages(transcript.messages) };
                setSelectedTranscript(t);
              }}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all"
            >
              View Transcript
            </button>
          </div>
        ))}
        {transcripts.length === 0 && (
          <div className="col-span-full py-20 text-center glass rounded-3xl border border-dashed border-white/10">
            <p className="text-slate-500 font-medium">No transcripts found.</p>
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedTranscript && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl w-full max-w-3xl max-h-[85vh] md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-white">Transcript: Ticket #{selectedTranscript.user}</h2>
                <p className="text-xs text-slate-400">Closed on {new Date(selectedTranscript.closed_at).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedTranscript(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-900/50">
              {selectedTranscript.messages && selectedTranscript.messages.length > 0 ? (
                selectedTranscript.messages.map((msg, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-indigo-400">{msg.author}</span>
                      <span className="text-[10px] text-slate-500">{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed break-words whitespace-pre-wrap bg-white/5 p-3 rounded-xl border border-white/5">
                      {msg.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-500">No messages found in this transcript.</div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/5 bg-white/5">
              <p className="text-xs text-slate-500 text-center italic">This is a permanent record of the closed ticket.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
