export interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  createdAt: Date;
}
