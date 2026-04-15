import { generateEmbeddings } from '../utils/embeddings.js';
import { searchMemoriesScored } from '../repositories/memory.repository.js';
import { filterRetrieved } from '../services/conflict-detection.service.js';
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
import { withBackoff } from '../utils/backoff.js';

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

  // c. Retrieve top 10 memories (more candidates for deduplication)
  const rawMemories = await searchMemoriesScored(vector, userId, 10);

  // c2. Deduplicate near-identical memories before building the prompt
  const dedupedMemories = await filterRetrieved(rawMemories);

  // d. Build system prompt with top 5 deduplicated memories
  const systemPrompt = buildChatSystemPrompt(
    dedupedMemories.slice(0, 5).map((m) => m.payload),
  );

  // e. Get or create conversation
  const conversation = await getOrCreateConversation(userId);
  const conversationId = conversation.id;

  // f. Truncation — use a character-based sliding window to prevent context overflow (approx 12k char limit)
  let charCount = 0;
  const recentMessages: IMessage[] = [];
  const MAX_HISTORY_CHARS = 12000;

  // Iterate backwards to keep the most recent messages
  for (let i = conversation.messages.length - 1; i >= 0; i--) {
    const msg = conversation.messages[i];
    if (!msg) continue;
    if (charCount + msg.content.length > MAX_HISTORY_CHARS) break;
    recentMessages.unshift(msg);
    charCount += msg.content.length;
  }

  // g. LLM call
  const client = getOpenRouterClient();

  let assistantContent: string;
  try {
    const completion = await withBackoff(() => 
      client.chat.completions.create({
        model: env.CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
      { maxRetries: 2, initialDelayMs: 1500 }
    );

    assistantContent = completion.choices[0]?.message?.content ?? '';
    if (!assistantContent) {
      throw new Error('Empty response from LLM');
    }
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ChatService] LLM request failed after retries:', msg);
    throw new AppError(502, `AI service unavailable: ${msg}. Please try again.`);
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
