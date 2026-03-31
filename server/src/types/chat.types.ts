export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface IConversation {
  userId: string;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDocument extends IConversation {
  id: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  success: true;
  data: {
    reply: string;
    conversationId: string;
  };
}

export interface ChatHistoryResponse {
  success: true;
  data: {
    messages: IMessage[];
    conversationId: string | null;
  };
}
