import { useChat } from '../hooks/useChat';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';

function RightSidebar() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    bottomRef,
    handleSubmit,
    handleClearChat,
  } = useChat();

  return (
    <aside className="w-full flex-1 flex flex-col bg-neutral-900 border border-neutral-800 rounded-none lg:rounded-3xl shadow-2xl overflow-hidden relative">
      {/* ── Background Elements ─────────────────────────────── */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────── */}
      <ChatHeader
        hasMessages={messages.length > 0}
        onClearChat={handleClearChat}
      />

      {/* ── Chat Messages Area ──────────────────────────────── */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        bottomRef={bottomRef}
        onSuggestionClick={setInput}
      />

      {/* ── Chat Input ──────────────────────────────────────── */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </aside>
  );
}

export default RightSidebar;
