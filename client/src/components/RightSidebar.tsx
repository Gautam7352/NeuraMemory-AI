import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useChat } from '../hooks/useChat';

const SUGGESTIONS = [
  'Summarize my recent notes',
  'What did I save about React?',
  'Find action items from meetings',
  'Draft an email based on my docs',
];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function MessageBubble({ role, content, isStreaming }: { role: 'user' | 'assistant'; content: string; isStreaming?: boolean }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-indigo-600/25 border border-indigo-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="w-6 h-6 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mt-0.5 shadow-sm shadow-indigo-500/20">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      </div>
      <div className="max-w-[85%] bg-white/4 border border-white/7 rounded-2xl rounded-tl-sm px-4 py-3">
        {content ? (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : isStreaming ? (
          <TypingDots />
        ) : null}
      </div>
    </div>
  );
}

function RightSidebar() {
  const isEnabled = import.meta.env.VITE_CHAT_ENABLED !== 'false';
  const { messages, streaming, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming || !isEnabled) return;
    sendMessage(text);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const showWelcome = messages.length === 0;

  return (
    <aside className="w-full h-full flex flex-col rounded-2xl overflow-hidden relative" style={{ background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 left-0 w-48 h-48 bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 relative z-10 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Neura AI</h2>
          <p className="text-[10px] text-slate-500">Ask about your memories</p>
        </div>
        {!isEnabled && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/15 rounded-full px-2 py-0.5">
            Soon
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5 relative z-10">
        {showWelcome && (
          <>
            <MessageBubble role="assistant" content="Hi! I'm Neura. I have access to all your saved memories — ask me anything about them." />
            <div className="flex flex-wrap gap-1.5 pl-9">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button"
                  disabled={!isEnabled || streaming}
                  onClick={() => { if (isEnabled && !streaming) sendMessage(s); }}
                  className={`text-[11px] font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/15 rounded-full px-2.5 py-1 transition-colors duration-150 ${!isEnabled || streaming ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
          return (
            <MessageBubble key={i} role={msg.role} content={msg.content} isStreaming={isLastAssistant && streaming} />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 relative z-10 shrink-0">
        <div className="flex items-end gap-2 bg-white/4 border border-white/8 focus-within:border-indigo-500/40 rounded-xl px-3 py-2 transition-colors duration-200">
          <textarea
            ref={textareaRef} rows={1}
            disabled={!isEnabled || streaming}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Neura is thinking…' : 'Ask about your memories…'}
            className="flex-1 max-h-32 min-h-[22px] bg-transparent text-sm text-white placeholder:text-slate-600 outline-none resize-none pt-0.5 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={!isEnabled || streaming || !input.trim()}
            onClick={handleSend}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md hover:shadow-indigo-500/20 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {streaming ? (
              <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M12 5l-6 6M12 5l6 6" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-center mt-1.5 text-[10px] text-slate-700">Neura AI can make mistakes. Verify important info.</p>
      </div>
    </aside>
  );
}

export default RightSidebar;
