import { extractMemories } from '../utils/extract.js';
import { generateEmbeddings } from '../utils/embeddings.js';
import {
  extractTextFromUrl,
  extractTextFromDocument,
} from '../utils/content-extractors.js';
import {
  upsertMemories,
  getMemoriesByUser,
  deleteMemoriesByUser,
  deleteMemoryById,
  getMemoryPointById,
  searchMemories,
} from '../repositories/memory.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  PlainTextInput,
  DocumentInput,
  LinkInput,
  MemoryResponse,
  MemoryEntry,
  MemorySource,
  StoredMemoryPayload,
} from '../types/memory.types.js';

async function processText(
  rawText: string,
  userId: string,
  source: MemorySource,
  sourceRef?: string,
): Promise<MemoryResponse> {
  if (!rawText.trim()) {
    return {
      success: true,
      message: 'No content to extract memories from.',
      data: { memoriesStored: 0, semantic: [], bubbles: [] },
    };
  }

  const extracted = await extractMemories(rawText);

  const entries: MemoryEntry[] = [
    ...extracted.semantic.map(
      (text): MemoryEntry => ({ text, kind: 'semantic' }),
    ),
    ...extracted.bubbles.map(
      (bubble): MemoryEntry => ({
        text: bubble.text,
        kind: 'bubble',
        importance: bubble.importance,
      }),
    ),
  ];

  if (entries.length === 0) {
    return {
      success: true,
      message: 'Text processed but no extractable memories found.',
      data: { memoriesStored: 0, semantic: [], bubbles: [] },
    };
  }

  const texts = entries.map((entry) => entry.text);
  const vectors = await generateEmbeddings(texts);

  if (vectors.length !== entries.length) {
    throw new AppError(
      500,
      `Embedding count mismatch: expected ${entries.length}, got ${vectors.length}.`,
    );
  }

  const now = new Date().toISOString();
  const points = entries.map((entry, index) => ({
    vector: vectors[index]!,
    payload: {
      userId,
      text: entry.text,
      kind: entry.kind,
      importance: entry.importance ?? (entry.kind === 'semantic' ? 1.0 : 0.5),
      source,
      ...(sourceRef ? { sourceRef } : {}),
      createdAt: now,
    } satisfies StoredMemoryPayload,
  }));

  await upsertMemories(points);

  return {
    success: true,
    message: `Successfully stored ${entries.length} memor${entries.length === 1 ? 'y' : 'ies'}.`,
    data: {
      memoriesStored: entries.length,
      semantic: extracted.semantic,
      bubbles: extracted.bubbles,
    },
  };
}

export async function processPlainText(
  input: PlainTextInput,
): Promise<MemoryResponse> {
  return processText(input.text, input.userId, 'text');
}

export async function processDocument(
  input: DocumentInput,
): Promise<MemoryResponse> {
  const text = await extractTextFromDocument(
    input.buffer,
    input.mimetype,
  );
  return processText(text, input.userId, 'document', input.filename);
}

export async function processLink(input: LinkInput): Promise<MemoryResponse> {
  const text = await extractTextFromUrl(input.url);
  return processText(text, input.userId, 'link', input.url);
}

export async function getUserMemories(
  userId: string,
  options?: { kind?: string; source?: MemorySource; limit?: number; offset?: string | null },
): Promise<{ points: StoredMemoryPayload[]; nextOffset: string | null }> {
  return getMemoriesByUser(userId, options);
}

/**
 * @planned vNext
 * Used by upcoming semantic search endpoints; intentionally exported early.
 */
export async function semanticSearch(
  vector: number[],
  userId: string,
  limit?: number,
): Promise<StoredMemoryPayload[]> {
  return searchMemories(vector, userId, limit);
}

export async function clearUserMemories(userId: string): Promise<void> {
  return deleteMemoriesByUser(userId);
}

export async function deleteUserMemoryById(
  userId: string,
  pointId: string,
): Promise<void> {
  const point = await getMemoryPointById(pointId);

  if (!point || point.payload.userId !== userId) {
    throw new AppError(403, 'Forbidden.');
  }

  await deleteMemoryById(pointId);
}
