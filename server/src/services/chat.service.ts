import { generateEmbeddings } from '../utils/embeddings.js';
import { searchMemories } from '../repositories/memory.repository.js';
import {
  getOrCreateConversation,
  getLatestConversation,
  appendMessages,
  clearConversationMessages,
} from '../repositories/conversation.repository.js';
import { getOpenRouterClient } from '../lib/openrouter.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import type { IMessage } from '../types/chat.types.js';
import type { StoredMemoryPayload } from '../types/memory.types.js';

/**
 * Formats retrieved memories into a system prompt for the chat LLM.
 */
export function buildChatSystemPrompt(memories: StoredMemoryPayload[]): string {
  const memoriesText =
    memories.length > 0
      ? memories.map((m) => `- ${m.text}`).join('\n')
      : '(No relevant memories found)';

  return `You are Neura, a personal AI assistant with access to the user's saved memories.

CRITICAL RULES — follow these without exception:
1. ALWAYS complete the task the user asks for immediately. Never ask clarifying questions before attempting the task.
2. Use the memory context below as your source material. If memories are relevant, use them directly.
3. If no memories are relevant, use your general knowledge and complete the task anyway.
4. Be direct and action-oriented. Do not say "I can help with that" or ask follow-up questions before delivering.
5. Keep responses concise and focused. No filler phrases.

--- MEMORY CONTEXT ---
${memoriesText}
--- END MEMORY CONTEXT ---

Complete the user's request now, using the memory context above where applicable.`;
}

/**
 * Full RAG pipeline: embed query → retrieve memories → build prompt → call LLM → persist.
 */
export async function sendMessage(
  userId: string,
  message: string,
): Promise<{ reply: string; conversationId: string }> {
  // a. Validate
  if (!message.trim()) {
    throw new AppError(400, 'Message cannot be empty.');
  }

  // b. Embed
  const [vector] = await generateEmbeddings([message]);
  if (!vector) {
    throw new AppError(500, 'Embedding generation returned no result.');
  }

  // c. Retrieve top 5 memories
  const memories = await searchMemories(vector, userId, 5);

  // d. Build system prompt
  const systemPrompt = buildChatSystemPrompt(memories);

  // e. Get or create conversation
  const conversation = await getOrCreateConversation(userId);
  const conversationId = conversation.id;

  // f. Truncation is handled by appendMessages — use last 20 messages for context
  const recentMessages = conversation.messages.slice(-20);

  // g. LLM call
  const client = getOpenRouterClient();

  let assistantContent: string;
  try {
    const completion = await client.chat.completions.create({
      model: env.CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    });

    assistantContent = completion.choices[0]?.message?.content ?? '';
    if (!assistantContent) {
      throw new Error('Empty response from LLM');
    }
  } catch {
    // h. If LLM call fails
    throw new AppError(502, 'AI service unavailable. Please try again.');
  }

  // i. Persist both messages
  const now = new Date();
  const userMsg: IMessage = { role: 'user', content: message, createdAt: now };
  const assistantMsg: IMessage = {
    role: 'assistant',
    content: assistantContent,
    createdAt: now,
  };

  await appendMessages(conversationId, userMsg, assistantMsg);

  // j. Return
  return { reply: assistantContent, conversationId };
}

/**
 * Returns the latest conversation's messages and id, or empty state if none.
 */
export async function getChatHistory(
  userId: string,
): Promise<{ messages: IMessage[]; conversationId: string | null }> {
  const conversation = await getLatestConversation(userId);

  if (!conversation) {
    return { messages: [], conversationId: null };
  }

  return {
    messages: conversation.messages,
    conversationId: conversation.id,
  };
}

/**
 * Clears all messages from the user's most recent conversation.
 */
export async function clearChatHistory(userId: string): Promise<void> {
  await clearConversationMessages(userId);
}
