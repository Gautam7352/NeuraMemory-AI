import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { generateEmbedding } from '../utils/embeddings.js';
import { searchMemories } from '../repositories/memory.repository.js';
import { getOpenRouterClient } from '../lib/openrouter.js';

export async function chatController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    next(new AppError(401, 'Authentication required.'));
    return;
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    next(new AppError(400, 'Message is required and must not be empty.'));
    return;
  }
  if (message.length > 10_000) {
    next(new AppError(400, 'Message must not exceed 10,000 characters.'));
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const vector = await generateEmbedding(message);
    const memories = await searchMemories(vector, userId, 10);

    const memoryContext = memories.length > 0
      ? memories.map((m, i) => `[${i + 1}] ${m.text}`).join('\n')
      : 'No relevant memories found.';

    const systemPrompt = `You are Neura, a personal AI assistant. Answer the user's question based on their saved memories below.\n\nMemories:\n${memoryContext}\n\nIf the memories don't contain relevant information, say so honestly.`;

    const openrouter = getOpenRouterClient();
    const stream = await openrouter.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) send({ type: 'token', content });
    }

    send({ type: 'done' });
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'An error occurred.';
    send({ type: 'error', message: msg });
    res.end();
  }
}
