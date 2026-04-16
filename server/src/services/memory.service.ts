import { extractMemories } from '../utils/extract.js';
import { generateEmbeddings } from '../utils/embeddings.js';
import {
  extractTextFromUrl,
  extractTextFromDocument,
} from '../utils/content-extractors.js';
import {
  extractTextWithUnstructured,
  isUnstructuredConfigured,
} from '../lib/unstructured.js';
import {
  upsertMemories,
  getMemoriesByUser,
  deleteMemoriesByUser,
  deleteMemoryById,
  searchMemories,
  getMemoryPointById,
  updateMemoryPoint,
  searchMemoriesScored,
  deleteMemoriesByIds,
  updatePayloadFields,
} from '../repositories/memory.repository.js';
import { checkBeforeStore } from '../services/conflict-detection.service.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { withTransaction } from '../lib/postgres.js';
import { lockUser } from '../repositories/user.repository.js';
import { logger } from '../utils/logger.js';
import pLimit from 'p-limit';
import type {
  PlainTextInput,
  DocumentInput,
  LinkInput,
  MemoryResponse,
  MemoryEntry,
  MemorySource,
  StoredMemoryPayload,
  IncomingMemory,
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
    if (rawText.length > 20) {
      logger.error(`[processText] Extraction yielded 0 results for significant input (${rawText.length} chars). Potential LLM extraction breakdown.`);
    }
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


  // Use single transaction + row lock to serialize ingestion per user
  return await withTransaction(async (client) => {
    // 1. Lock this user's record so no other ingestion runs concurrently for them
    await lockUser(client, userId);

    const limit = pLimit(5);
    const results = await Promise.all(
      points.map((point) => 
        limit(async () => {
          const incomingMemory: IncomingMemory = {
            text: point.payload.text,
            vector: point.vector,
            kind: point.payload.kind,
            importance: point.payload.importance,
            source: point.payload.source,
            createdAt: point.payload.createdAt,
          };

          try {
            const candidates = await searchMemoriesScored(point.vector, userId, 10);
            const resolution = await checkBeforeStore(
              incomingMemory,
              candidates,
              env.CONFLICT_STRATEGY,
            );
            return { point, candidates, resolution };
          } catch (err) {
            console.warn(
              '[processText] Point processing failed, falling back to simple store:',
              err instanceof Error ? err.message : err,
            );
            return {
              point,
              candidates: [],
              resolution: { action: 'store', pointsToDelete: [], pointToStore: incomingMemory } as const,
            };
          }
        })
      ),
    );

    const toUpsert: Array<{ vector: number[]; payload: StoredMemoryPayload }> = [];
    const toDelete = new Set<string>();
    const toUpdatePayloads: Array<{ ids: string[]; fields: Partial<StoredMemoryPayload> }> = [];

    for (const { point, candidates, resolution } of results) {
      switch (resolution.action) {
        case 'store': {
          toUpsert.push(point);
          break;
        }
        case 'replace':
        case 'merge': {
          for (const id of resolution.pointsToDelete) {
            const existing = candidates.find((c: any) => c.id === id);
            if (existing && existing.payload.userId === userId) {
              toDelete.add(id);
            }
          }
          if (resolution.pointToStore) {
            toUpsert.push({
              vector: resolution.pointToStore.vector,
              payload: { ...resolution.pointToStore, userId } as StoredMemoryPayload,
            });
          }
          break;
        }
        case 'flag': {
          if (resolution.pointToStore) {
            toUpsert.push({
              vector: resolution.pointToStore.vector,
              payload: { ...resolution.pointToStore, userId } as StoredMemoryPayload,
            });
          }
          if (resolution.conflictGroupId) {
            const idsToFlag = candidates
              .filter(
                (c: any) =>
                  c.score >= env.SIMILARITY_THRESHOLD &&
                  c.payload.userId === userId,
              )
              .map((c: any) => c.id);
            
            if (idsToFlag.length > 0) {
              toUpdatePayloads.push({
                ids: idsToFlag,
                fields: {
                  conflicted: true,
                  conflictGroupId: resolution.conflictGroupId,
                },
              });
            }
          }
          break;
        }
        case 'skip':
          break;
      }
    }

    // Execute batch operations
    if (toDelete.size > 0) {
      await deleteMemoriesByIds(Array.from(toDelete));
    }
    if (toUpsert.length > 0) {
      await upsertMemories(toUpsert);
    }
    for (const update of toUpdatePayloads) {
      await updatePayloadFields(update.ids, update.fields);
    }

    const memoriesStoredCount = toUpsert.length;

    return {
      success: true,
      message: `Successfully processed document. Stored ${memoriesStoredCount} memory point(s).`,
      data: {
        memoriesStored: memoriesStoredCount,
        semantic: extracted.semantic,
        bubbles: extracted.bubbles,
      },
    };
  });
}

export async function processPlainText(
  input: PlainTextInput,
): Promise<MemoryResponse> {
  return processText(input.text, input.userId, 'text');
}

export async function processDocument(
  input: DocumentInput,
): Promise<MemoryResponse> {
  const text = isUnstructuredConfigured()
    ? await extractTextWithUnstructured(
        input.buffer,
        input.filename,
        input.mimetype,
      )
    : await extractTextFromDocument(input.buffer, input.mimetype);
  
  const limit = pLimit(3); 
  return limit(() => processText(text, input.userId, 'document', input.filename));
}

export async function processLink(input: LinkInput): Promise<MemoryResponse> {
  const text = await extractTextFromUrl(input.url);
  
  const limit = pLimit(5);
  return limit(() => processText(text, input.userId, 'link', input.url));
}

export async function getUserMemories(
  userId: string,
  options?: {
    kind?: string;
    source?: MemorySource;
    limit?: number;
    offset?: string | null;
  },
): Promise<{
  points: (StoredMemoryPayload & { id: string })[];
  nextOffset: string | null;
}> {
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
  // Qdrant doesn't enforce userId on point deletion by ID,
  // so we verify ownership by checking the point exists for this user first.
  const point = await getMemoryPointById(pointId);

  if (!point || point.payload.userId !== userId) {
    throw new AppError(
      403,
      'Forbidden: memory does not exist or does not belong to this user.',
    );
  }

  await deleteMemoryById(pointId);
}

export async function updateMemoryById(
  userId: string,
  pointId: string,
  newText: string,
): Promise<void> {
  if (!newText.trim()) {
    throw new AppError(400, 'Memory text cannot be empty.');
  }

  const point = await getMemoryPointById(pointId);
  if (!point || point.payload.userId !== userId) {
    throw new AppError(403, 'Forbidden: memory does not belong to this user.');
  }

  const [vector] = await generateEmbeddings([newText]);
  if (!vector) {
    throw new AppError(500, 'Embedding generation returned no result.');
  }

  await updateMemoryPoint(pointId, vector, newText, point.payload);
}
