import { api } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string; // ISO string from JSON
}

export async function sendMessage(
  message: string,
): Promise<{ reply: string; conversationId: string }> {
  const response = await api.post('/api/v1/chat', { message });
  return response.data.data;
}

export async function getChatHistory(): Promise<{
  messages: ChatMessage[];
  conversationId: string | null;
}> {
  const response = await api.get('/api/v1/chat/history');
  return response.data.data;
}

export async function clearChatHistory(): Promise<void> {
  await api.delete('/api/v1/chat/history');
}
