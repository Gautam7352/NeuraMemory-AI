/**
 * Conversation repository — all PostgreSQL operations for chat conversations.
 *
 * Responsibilities:
 *  - Get or create a conversation for a user
 *  - Append messages to a conversation (with 200-message cap)
 *  - Retrieve the latest conversation for a user
 *  - Clear messages from a conversation
 */

import { query } from '../lib/postgres.js';
import type { ConversationDocument, IMessage } from '../types/chat.types.js';

const MAX_MESSAGES = 200;

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Returns the most recently updated conversation for the user, or null.
 */
export async function getLatestConversation(
  userId: string,
): Promise<ConversationDocument | null> {
  const result = await query<ConversationDocument>(
    `SELECT id, user_id as "userId", title, messages, created_at as "createdAt", updated_at as "updatedAt"
     FROM conversations
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Finds the most recent conversation for the user, or creates a new one
 * with an auto-generated title and empty messages array.
 */
export async function getOrCreateConversation(
  userId: string,
): Promise<ConversationDocument> {
  const existing = await getLatestConversation(userId);
  if (existing) return existing;

  const result = await query<ConversationDocument>(
    `INSERT INTO conversations (user_id, title, messages)
     VALUES ($1, $2, '[]'::jsonb)
     RETURNING id, user_id as "userId", title, messages, created_at as "createdAt", updated_at as "updatedAt"`,
    [userId, 'New Conversation'],
  );

  return result.rows[0] as ConversationDocument;
}

/**
 * Pushes both messages to the conversation's messages array and updates
 * `updatedAt`. If the array already has 198+ entries, the oldest messages
 * are truncated so the total stays at or below 200 after appending.
 */
export async function appendMessages(
  conversationId: string,
  userMsg: IMessage,
  assistantMsg: IMessage,
): Promise<void> {
  // First, get the current messages
  const currentResult = await query<{ messages: IMessage[] }>(
    `SELECT messages FROM conversations WHERE id = $1`,
    [conversationId],
  );

  if (currentResult.rowCount === 0) return;

  let messages = currentResult.rows[0]?.messages || [];

  // Truncate if we are exceeding MAX_MESSAGES
  if (messages.length >= MAX_MESSAGES - 1) {
    const keepFrom = messages.length - (MAX_MESSAGES - 2);
    messages = messages.slice(keepFrom);
  }

  messages.push(userMsg, assistantMsg);

  await query(
    `UPDATE conversations 
     SET messages = $1::jsonb, updated_at = now()
     WHERE id = $2`,
    [JSON.stringify(messages), conversationId],
  );
}

/**
 * Sets the messages array to [] and updates `updatedAt` on the user's
 * most recent conversation.
 */
export async function clearConversationMessages(userId: string): Promise<void> {
  // Update the latest conversation for the user
  await query(
    `UPDATE conversations 
     SET messages = '[]'::jsonb, updated_at = now()
     WHERE id = (
       SELECT id FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1
     )`,
    [userId],
  );
}
