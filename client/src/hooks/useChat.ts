import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import type { ChatMessage } from '../types';

const CHAT_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/chat`;

function makeId() {
  return Math.random().toString(36).slice(2);
}

export function useChat() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const runStream = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: text, timestamp: Date.now() };
    const assistantId = makeId();
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

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
              setMessages((prev) => prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.content } : m
              ));
            } else if (event.type === 'done') {
              done = true;
              break;
            } else if (event.type === 'error') {
              showToast('error', event.message ?? 'Chat error occurred.');
              done = true;
              break;
            }
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to chat.';
      showToast('error', msg);
      // remove empty assistant bubble on error
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.id === assistantId && last.content === '' ? prev.slice(0, -1) : prev;
      });
    } finally {
      setStreaming(false);
    }
  }, [showToast]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || streaming) return;
      runStream(text.trim());
    },
    [streaming, runStream],
  );

  const regenerate = useCallback(() => {
    // find last user message and re-run
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || streaming) return;
    // strip last assistant message if present
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' ? prev.slice(0, -1) : prev;
    });
    runStream(lastUser.content);
  }, [messages, streaming, runStream]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, streaming, sendMessage, regenerate, clearMessages };
}
