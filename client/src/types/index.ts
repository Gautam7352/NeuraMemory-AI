export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface MemoryStats {
  total: number;
  byKind: {
    semantic: number;
    bubble: number;
  };
  bySource: {
    text: number;
    link: number;
    document: number;
  };
}

export interface UserProfile {
  email: string;
  createdAt: string;
}
