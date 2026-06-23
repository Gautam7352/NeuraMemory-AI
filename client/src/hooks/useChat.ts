import { useState, useEffect, useRef } from 'react';
import {
  sendMessage as sendChatMessage,
  getChatHistory,
  clearChatHistory,
} from '../lib/chatApi';
import type { ChatMessage } from '../types/chat';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    getChatHistory()
      .then(({ messages: history, conversationId: cid }) => {
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: new Date(m.createdAt),
            })),
          );
        }
        if (cid) setConversationId(cid);
      })
      .catch(() => {
        // silently ignore history load errors
      });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const savedInput = input;
    const userMessage: ChatMessage = {
      role: 'user',
      content: savedInput,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { reply, conversationId: cid } = await sendChatMessage(savedInput);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, createdAt: new Date() },
      ]);
      setConversationId(cid);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: message, createdAt: new Date() },
      ]);
      setInput(savedInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    await clearChatHistory();
    setMessages([]);
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    bottomRef,
    handleSubmit,
    handleClearChat,
  };
}
