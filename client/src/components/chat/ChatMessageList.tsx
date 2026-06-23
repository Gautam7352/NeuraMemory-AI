import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types/chat';
import { AssistantAvatar } from './AssistantAvatar';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onSuggestionClick: (suggestion: string) => void;
}

const SUGGESTIONS = [
  'Summarize my recent notes',
  'What did I save about React?',
  'Find action items from meetings',
  'Draft an email based on my docs',
];

export const ChatMessageList = ({
  messages,
  isLoading,
  bottomRef,
  onSuggestionClick,
}: ChatMessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 relative z-10 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
      {/* Welcome message */}
      <div className="flex items-start gap-3">
        <AssistantAvatar />
        <div className="bg-neutral-800/80 border border-neutral-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-200 leading-relaxed">
            Hi! I'm your Neura assistant. I have access to all your saved text,
            links, and documents. What would you like to know?
          </p>
        </div>
      </div>

      {/* Suggestion chips — hidden once conversation starts */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mt-2 pl-10">
          {SUGGESTIONS.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(suggestion)}
              className="text-xs font-medium text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-900/50 rounded-full px-3 py-1.5 transition-colors duration-150 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Conversation messages */}
      {messages.map((msg, i) => {
        if (msg.role === 'user') {
          return (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] bg-linear-to-br from-violet-500 to-sky-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        }

        if (msg.role === 'error') {
          return (
            <div key={i} className="flex items-start gap-3">
              <AssistantAvatar />
              <div className="max-w-[80%] bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        }

        // assistant
        return (
          <div key={i} className="flex items-start gap-3">
            <AssistantAvatar />
            <div className="max-w-[80%] bg-neutral-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <AssistantAvatar />
          <div className="bg-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1 items-center h-5">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
