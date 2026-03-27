/**
 * Memory repository — all Qdrant vector database operations for memories.
 *
 * Responsibilities:
 *  - Ensure the collection exists (auto‑create on first use)
 *  - Upsert embedded memory points
 *  - Search / retrieve / delete memories by user
 */

import { randomUUID } from 'node:crypto';
import { getQdrantClient } from '../lib/qdrant.js';
import { EMBEDDING_DIMENSION } from '../utils/embeddings.js';
import type {
  StoredMemoryPayload,
  MemorySource,
} from '../types/memory.types.js';

const COLLECTION_NAME = 'memories';

let collectionReady = false;

// ---------------------------------------------------------------------------
// Collection bootstrap
// ---------------------------------------------------------------------------

/**
 * Ensures the `memories` collection exists in Qdrant with the correct schema.
 * Called lazily on first write so the app can start even if Qdrant is slow.
 */
async function ensureCollection(): Promise<void> {
  if (collectionReady) return;

  const client = getQdrantClient();

  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME,
    );

    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: 'Cosine',
        },
      });

      // Create payload indexes for filtering
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'userId',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'kind',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'source',
        field_schema: 'keyword',
      });

      console.log(
        `[MemoryRepo] Created Qdrant collection "${COLLECTION_NAME}" with dimension ${EMBEDDING_DIMENSION}.`,
      );
    }

    collectionReady = true;
  } catch (err) {
    console.error('[MemoryRepo] Failed to ensure collection:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export interface UpsertMemoryPoint {
  vector: number[];
  payload: StoredMemoryPayload;
}

/**
 * Upserts an array of memory points into Qdrant.
 *
 * @returns The IDs of the upserted points.
 */
export async function upsertMemories(
  points: UpsertMemoryPoint[],
): Promise<string[]> {
  if (points.length === 0) return [];

  await ensureCollection();

  const client = getQdrantClient();
  const ids = points.map(() => randomUUID());

  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: points.map((p, i) => ({
      id: ids[i]!,
      vector: p.vector,
      payload: p.payload as unknown as Record<string, unknown>,
    })),
  });

  console.log(
    `[MemoryRepo] Upserted ${points.length} memory point(s) for user ${points[0]?.payload.userId}.`,
  );

  return ids;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Search memories by semantic similarity for a given user.
 */
export async function searchMemories(
  vector: number[],
  userId: string,
  limit = 10,
): Promise<StoredMemoryPayload[]> {
  await ensureCollection();
  const client = getQdrantClient();

  const results = await client.search(COLLECTION_NAME, {
    vector,
    limit,
    filter: {
      must: [{ key: 'userId', match: { value: userId } }],
    },
    with_payload: true,
  });

  return results.map((r) => r.payload as unknown as StoredMemoryPayload);
}

/**
 * Retrieve all memories for a user, optionally filtered by kind or source.
 * Supports cursor-based pagination via `offset`.
 */
export async function getMemoriesByUser(
  userId: string,
  options?: { kind?: string; source?: MemorySource; limit?: number; offset?: string | null },
): Promise<{ points: StoredMemoryPayload[]; nextOffset: string | null }> {
  await ensureCollection();
  const client = getQdrantClient();

  const must: Array<Record<string, unknown>> = [
    { key: 'userId', match: { value: userId } },
  ];

  if (options?.kind) {
    must.push({ key: 'kind', match: { value: options.kind } });
  }
  if (options?.source) {
    must.push({ key: 'source', match: { value: options.source } });
  }

  const results = await client.scroll(COLLECTION_NAME, {
    filter: { must },
    limit: options?.limit ?? 100,
    ...(options?.offset != null ? { offset: options.offset } : {}),
    with_payload: true,
    with_vector: false,
  });

  return {
    points: results.points.map((p) => p.payload as unknown as StoredMemoryPayload),
    nextOffset: results.next_page_offset ? String(results.next_page_offset) : null,
  };
}

// ---------------------------------------------------------------------------
// Delete operations
// ---------------------------------------------------------------------------

/**
 * Delete all memories for a user.
 */
export async function deleteMemoriesByUser(userId: string): Promise<void> {
  await ensureCollection();
  const client = getQdrantClient();

  await client.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [{ key: 'userId', match: { value: userId } }],
    },
  });

  console.log(`[MemoryRepo] Deleted all memories for user ${userId}.`);
}

/**
 * Delete a specific memory point by its Qdrant ID.
 *
 * @planned vNext
 * Reserved for future single-memory deletion endpoints.
 */
export async function deleteMemoryById(pointId: string): Promise<void> {
  await ensureCollection();
  const client = getQdrantClient();

  await client.delete(COLLECTION_NAME, {
    wait: true,
    points: [pointId],
  });
}
