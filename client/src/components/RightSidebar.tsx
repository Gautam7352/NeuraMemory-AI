import { useState } from 'react';

function RightSidebar() {
  const [message, setMessage] = useState('');
  const isComingSoon = true;

  return (
    <aside className="w-full h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden relative">
      {/* ── Background Elements ─────────────────────────────── */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col p-6 pb-2 relative z-10 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-sky-500 shadow-md">
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Neura AI
          </h2>
        </div>
        <p className="text-xs font-medium text-slate-400">
          Ask questions about your memories
        </p>
      </div>

      {/* ── Chat Messages Area (Placeholder for later) ──────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 relative z-10 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {/* AI Welcome Message */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-linear-to-br from-violet-500 to-sky-500 mt-1 shadow-sm">
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="bg-neutral-800/80 border border-neutral-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-200 leading-relaxed">
              Hi! I'm your Neura assistant. I have access to all your saved
              text, links, and documents. What would you like to know?
            </p>
          </div>
        </div>

        {/* Suggested chips container */}
        <div className="flex flex-wrap gap-2 mt-2 pl-10">
          {[
            'Summarize my recent notes',
            'What did I save about React?',
            'Find action items from meetings',
            'Draft an email based on my docs',
          ].map((suggestion, i) => (
            <button
              key={i}
              disabled={isComingSoon}
              className={`text-xs font-medium text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-900/50 rounded-full px-3 py-1.5 transition-colors duration-150${isComingSoon ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat Input ──────────────────────────────────────── */}
      <div className="p-4 bg-neutral-900/80 backdrop-blur-md border-t border-neutral-800 relative z-10 shrink-0">
        <div className="relative flex items-end gap-2 bg-neutral-800/50 border border-neutral-700 focus-within:border-sky-500 rounded-2xl px-3 py-2.5 transition-colors duration-200 shadow-inner">
          {/* Attachment Button (reserved for future) */}
          <button className="flex items-center justify-center w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-neutral-700 transition shrink-0 cursor-pointer">
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          <textarea
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isComingSoon}
            placeholder={
              isComingSoon ? 'Chat coming soon…' : 'Message Neura AI...'
            }
            className="flex-1 max-h-32 min-h-[24px] bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none pt-1"
          />

          {/* Send Button */}
          <button
            disabled={isComingSoon || !message.trim()}
            title={isComingSoon ? 'Semantic search coming soon' : 'Send'}
            className={`flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-sky-500 text-white shadow-lg hover:shadow-sky-500/25 transition shrink-0${isComingSoon ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer'}`}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5M12 5l-6 6M12 5l6 6"
              />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2 pb-1">
          <span className="text-[10px] text-slate-500">
            Neura AI can make mistakes. Verify important info.
          </span>
        </div>
      </div>
    </aside>
  );
}

export default RightSidebar;
