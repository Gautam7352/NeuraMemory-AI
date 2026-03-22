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
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ role, content, isStreaming }: { role: 'user' | 'assistant'; content: string; isStreaming?: boolean }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-sky-600/80 border border-sky-500/40 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 mt-1 shadow-sm">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      </div>
      <div className="max-w-[85%] bg-neutral-800/80 border border-neutral-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
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
  const isEnabled = import.meta.env.VITE_CHAT_ENABLED === 'true';
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    if (!isEnabled || streaming) return;
    sendMessage(text);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  const showWelcome = messages.length === 0;

  return (
    <aside className="w-full h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden relative">

      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="flex flex-col p-6 pb-2 relative z-10 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 shadow-md">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Neura AI</h2>
          {!isEnabled && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
              Coming soon
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-slate-400">
          Ask questions about your memories
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 relative z-10 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">

        {showWelcome && (
          <>
            <MessageBubble
              role="assistant"
              content="Hi! I'm your Neura assistant. I have access to all your saved text, links, and documents. What would you like to know?"
            />
            <div className="flex flex-wrap gap-2 pl-10">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!isEnabled || streaming}
                  onClick={() => handleSuggestion(s)}
                  className={`text-xs font-medium text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-900/50 rounded-full px-3 py-1.5 transition-colors duration-150 ${
                    !isEnabled || streaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
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
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={isLastAssistant && streaming}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-neutral-900/80 backdrop-blur-md border-t border-neutral-800 relative z-10 shrink-0">
        <div className="relative flex items-end gap-2 bg-neutral-800/50 border border-neutral-700 focus-within:border-sky-500 rounded-2xl px-3 py-2.5 transition-colors duration-200 shadow-inner">

          <textarea
            ref={textareaRef}
            rows={1}
            disabled={!isEnabled || streaming}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Neura is thinking…' : 'Message Neura AI…'}
            className="flex-1 max-h-32 min-h-[24px] bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none pt-1 disabled:cursor-not-allowed"
          />

          <button
            type="button"
            disabled={!isEnabled || streaming || !input.trim()}
            onClick={handleSend}
            title={!isEnabled ? 'Chat coming soon' : 'Send'}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-lg hover:shadow-sky-500/25 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {streaming ? (
              <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M12 5l-6 6M12 5l6 6" />
              </svg>
            )}
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
