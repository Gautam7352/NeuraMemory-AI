import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useChat } from '../hooks/useChat';

// ─── Context menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  content: string;
}

function ContextMenu({ x, y, content, onClose }: ContextMenuState & { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Adjust position so menu doesn't overflow viewport
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: x + rect.width > window.innerWidth ? x - rect.width : x,
      y: y + rect.height > window.innerHeight ? y - rect.height : y,
    });
  }, [x, y]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler as unknown as EventListener);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler as unknown as EventListener);
    };
  }, [onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 900);
  };

  const handleCopyPlain = async () => {
    // Strip markdown for plain text copy
    const plain = content
      .replace(/```[\s\S]*?```/g, (m) => m.split('\n').slice(1, -1).join('\n'))
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/^[-*+]\s/gm, '• ')
      .trim();
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 900);
  };

  return (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-xl py-1 shadow-2xl animate-fade-in min-w-[160px]"
      style={{ left: pos.x, top: pos.y, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <button type="button" onClick={handleCopy}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/6 hover:text-white transition-colors cursor-pointer text-left">
        {copied ? (
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
        {copied ? 'Copied!' : 'Copy message'}
      </button>
      <button type="button" onClick={handleCopyPlain}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/6 hover:text-white transition-colors cursor-pointer text-left">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10" />
        </svg>
        Copy as plain text
      </button>
    </div>
  );
}

// ─── Lightweight markdown renderer ───────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <CodeBlock key={i} lang={lang} code={codeLines.join('\n')} />
      );
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? 'text-base font-bold text-white mt-2 mb-1'
        : level === 2 ? 'text-sm font-bold text-slate-100 mt-2 mb-0.5'
        : 'text-sm font-semibold text-slate-200 mt-1';
      nodes.push(<p key={i} className={cls}>{inlineMarkdown(headingMatch[2])}</p>);
      i++;
      continue;
    }

    // Unordered list item
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={i} className="list-none space-y-1 my-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list item
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
        num++;
      }
      nodes.push(
        <ol key={i} className="space-y-1 my-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="text-indigo-400 font-mono text-xs mt-0.5 shrink-0 w-4">{j + 1}.</span>
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>
      );
      void num;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-white/8 my-2" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote key={i} className="border-l-2 border-indigo-500/50 pl-3 my-1 text-sm text-slate-400 italic">
          {inlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={i} className="text-sm text-slate-200 leading-relaxed">
        {inlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Split on bold, italic, inline code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[12px] bg-white/8 text-indigo-300 rounded px-1 py-0.5">{part.slice(1, -1)}</code>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    return part;
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <span className="text-[10px] font-mono text-slate-500">{lang || 'code'}</span>
        <button type="button" onClick={copy}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition cursor-pointer flex items-center gap-1">
          {copied ? (
            <><svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
          ) : (
            <><svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Copy</>
          )}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto text-[12px] font-mono text-slate-300 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[5px] h-[5px] rounded-full bg-indigo-400/60 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.9s' }} />
      ))}
    </span>
  );
}

function Avatar() {
  return (
    <div className="w-6 h-6 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm mt-0.5">
      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    </div>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({
  role, content, timestamp, isStreaming, onCopy,
}: {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!content) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  if (role === 'user') {
    return (
      <>
        {ctxMenu && (
          <ContextMenu x={ctxMenu.x} y={ctxMenu.y} content={content} onClose={() => setCtxMenu(null)} />
        )}
        <div className="flex justify-end gap-2 group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          onContextMenu={handleContextMenu}>
          <div className="flex flex-col items-end gap-1 max-w-[82%]">
            <div className="rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-slate-100 leading-relaxed whitespace-pre-wrap select-text"
              style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.22)' }}>
              {content}
            </div>
            <span className={`text-[10px] text-slate-700 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
              {formatTime(timestamp)}
            </span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} content={content} onClose={() => setCtxMenu(null)} />
      )}
      <div className="flex items-start gap-2.5 group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onContextMenu={handleContextMenu}>
        <Avatar />
        <div className="flex flex-col gap-1 max-w-[82%] min-w-0">
          <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 min-w-0 select-text"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {content ? (
              <div className="flex flex-col gap-0.5">
                {renderMarkdown(content)}
                {isStreaming && (
                  <span className="inline-block w-0.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-full" />
                )}
              </div>
            ) : isStreaming ? (
              <TypingDots />
            ) : null}
          </div>
          <div className={`flex items-center gap-2 transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-[10px] text-slate-700">{formatTime(timestamp)}</span>
            {content && (
              <button type="button" onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-300 transition cursor-pointer">
                {copied ? (
                  <><svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
                ) : (
                  <><svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Copy</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: '📝', text: 'Summarize my recent notes' },
  { icon: '⚛️', text: 'What did I save about React?' },
  { icon: '✅', text: 'Find action items from meetings' },
  { icon: '✉️', text: 'Draft an email based on my docs' },
];

// ─── Main component ───────────────────────────────────────────────────────────

function RightSidebar() {
  const isEnabled = import.meta.env.VITE_CHAT_ENABLED !== 'false';
  const { messages, streaming, sendMessage, regenerate, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMessages = messages.length > 0;
  const lastIsAssistant = messages[messages.length - 1]?.role === 'assistant';

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Detect manual scroll up → disable auto-scroll
  const onScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming || !isEnabled) return;
    sendMessage(text);
    setInput('');
    setAutoScroll(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const msgCount = messages.filter((m) => m.role === 'user').length;

  return (
    <aside className="w-full h-full flex flex-col rounded-2xl overflow-hidden relative"
      style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.07)' }}>

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0 relative z-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white leading-none">Neura AI</p>
            {hasMessages && (
              <span className="text-[9px] font-semibold text-slate-600 bg-white/5 rounded-full px-1.5 py-0.5">
                {msgCount} {msgCount === 1 ? 'msg' : 'msgs'}
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5 leading-none">
            {streaming
              ? <span className="text-indigo-400 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse inline-block" />Thinking…</span>
              : <span className="text-slate-500">Memory-aware assistant</span>
            }
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* Scroll lock indicator */}
          {hasMessages && !autoScroll && (
            <button type="button" onClick={() => { setAutoScroll(true); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              title="Scroll to bottom"
              className="w-6 h-6 flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-400/10 transition cursor-pointer">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {/* Regenerate */}
          {hasMessages && lastIsAssistant && !streaming && (
            <button type="button" onClick={regenerate} title="Regenerate response"
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/6 transition cursor-pointer">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {/* Clear */}
          {hasMessages && (
            <button type="button" onClick={clearMessages} title="Clear chat"
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition cursor-pointer">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollContainerRef} onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3.5 py-4 flex flex-col gap-3.5 relative z-10">

        {!hasMessages && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <Avatar />
              <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-300 leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Hi! I'm Neura. I have access to all your saved memories — ask me anything about them.
              </div>
            </div>
            <div className="flex flex-col gap-1.5 pl-8">
              {SUGGESTIONS.map((s) => (
                <button key={s.text} type="button"
                  disabled={!isEnabled || streaming}
                  onClick={() => { if (isEnabled && !streaming) { sendMessage(s.text); setAutoScroll(true); } }}
                  className="text-left text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
          return (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              isStreaming={isLastAssistant && streaming}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 p-3 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="rounded-xl transition-all duration-200 focus-within:border-indigo-500/30"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <textarea
            ref={textareaRef} rows={1}
            disabled={!isEnabled || streaming}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Neura is thinking…' : 'Ask about your memories…'}
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 outline-none resize-none px-3.5 pt-3 pb-1 max-h-36 min-h-[40px] disabled:cursor-not-allowed"
            style={{ lineHeight: '1.5' }}
          />
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <span className="text-[10px] text-slate-700 select-none">⏎ send · ⇧⏎ newline</span>
            <button type="button"
              disabled={!isEnabled || streaming || !input.trim()}
              onClick={handleSend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && !streaming ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.06)',
                color: input.trim() && !streaming ? 'white' : '#64748b',
              }}
            >
              {streaming ? (
                <svg className="animate-spin" width="12" height="12" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M12 5l-6 6M12 5l6 6" />
                </svg>
              )}
              Send
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default RightSidebar;
