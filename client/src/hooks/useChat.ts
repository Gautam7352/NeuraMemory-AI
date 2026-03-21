import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import type { ChatMessage } from '../types';

export function useChat() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      // Append user message + empty assistant placeholder
      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);

      try {
        const res = await fetch('/api/v1/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: text.trim() }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw) as { type: string; content?: string; message?: string };

              if (event.type === 'token' && event.content) {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === 'assistant') {
                    next[next.length - 1] = { ...last, content: last.content + event.content };
                  }
                  return next;
                });
              } else if (event.type === 'done') {
                break;
              } else if (event.type === 'error') {
                showToast('error', event.message ?? 'Chat error occurred.');
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to connect to chat.';
        showToast('error', msg);
        // Remove the empty assistant placeholder on hard failure
        setMessages((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.role === 'assistant' && next[next.length - 1].content === '') {
            next.pop();
          }
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [streaming, showToast],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, streaming, sendMessage, clearMessages };
}
