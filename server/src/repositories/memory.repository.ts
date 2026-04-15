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
  ScoredMemory,
} from '../types/memory.types.js';

const COLLECTION_NAME = 'memories';

let collectionInitPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Collection bootstrap
// ---------------------------------------------------------------------------

/**
 * Ensures the `memories` collection exists in Qdrant with the correct schema.
 * Called lazily on first write so the app can start even if Qdrant is slow.
 */
async function ensureCollection(): Promise<void> {
  if (collectionInitPromise) return collectionInitPromise;

  collectionInitPromise = (async () => {
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
    } catch (err) {
      collectionInitPromise = null;
      console.error('[MemoryRepo] Failed to ensure collection:', err);
      throw err;
    }
  })();

  return collectionInitPromise;
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
    points: results.points.map((p) => ({
      id: String(p.id),
      ...(p.payload as unknown as StoredMemoryPayload),
    })),
    nextOffset: results.next_page_offset
      ? String(results.next_page_offset)
      : null,
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
 * Update an existing memory point's vector and text payload.
 *
 * @param pointId - The Qdrant point ID to update.
 * @param vector  - The new embedding vector for the updated text.
 * @param text    - The new text content to store in the payload.
 */
export async function updateMemoryPoint(
  pointId: string,
  vector: number[],
  text: string,
  existingPayload: Partial<StoredMemoryPayload> = {},
): Promise<void> {
  await ensureCollection();
  const client = getQdrantClient();

  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: pointId,
        vector,
        payload: {
          ...existingPayload,
          text,
          updatedAt: new Date().toISOString(),
        },
      },
    ],
  });

  console.log(`[MemoryRepo] Updated memory point ${pointId}.`);
}

/**
 * Retrieve a single memory point by its Qdrant ID.
 */
export async function getMemoryPointById(
  pointId: string,
): Promise<{ id: string; payload: StoredMemoryPayload } | null> {
  await ensureCollection();
  const client = getQdrantClient();

  const results = await client.retrieve(COLLECTION_NAME, {
    ids: [pointId],
    with_payload: true,
    with_vector: false,
  });

  if (results.length === 0) return null;

  return {
    id: String(results[0]!.id),
    payload: results[0]!.payload as unknown as StoredMemoryPayload,
  };
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

// ---------------------------------------------------------------------------
// Conflict-resolution helpers (Tasks 7.1 – 7.3)
// ---------------------------------------------------------------------------

/**
 * Search memories by semantic similarity and return scored results including
 * the raw vector so callers can run further filtering (e.g. filterRetrieved).
 *
 * Requirements: 1.1, 7.1, 8.6
 */
export async function searchMemoriesScored(
  vector: number[],
  userId: string,
  limit = 10,
): Promise<ScoredMemory[]> {
  await ensureCollection();
  const client = getQdrantClient();

  const results = await client.search(COLLECTION_NAME, {
    vector,
    limit,
    filter: {
      must: [{ key: 'userId', match: { value: userId } }],
    },
    with_payload: true,
    with_vector: true,
  });

  return results.map((r) => {
    const base = {
      id: String(r.id),
      payload: r.payload as unknown as StoredMemoryPayload,
      score: r.score,
    };
    const vec = r.vector as number[] | undefined;
    return vec ? { ...base, vector: vec } : base;
  });
}

/**
 * Delete multiple memory points by their Qdrant IDs in a single call.
 *
 * Requirements: 7.4
 */
export async function deleteMemoriesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  await ensureCollection();
  const client = getQdrantClient();

  await client.delete(COLLECTION_NAME, {
    wait: true,
    points: ids,
  });

  console.log(`[MemoryRepo] Deleted ${ids.length} memory point(s): ${ids.join(', ')}.`);
}

/**
 * Patch specific payload fields on one or more existing memory points without
 * overwriting the rest of the payload (used to set `conflicted` /
 * `conflictGroupId` for the `flag` resolution strategy).
 *
 * Requirements: 7.6
 */
export async function updatePayloadFields(
  pointIds: string[],
  fields: Partial<StoredMemoryPayload>,
): Promise<void> {
  if (pointIds.length === 0) return;

  await ensureCollection();
  const client = getQdrantClient();

  await client.setPayload(COLLECTION_NAME, {
    payload: fields as Record<string, unknown>,
    points: pointIds,
    wait: true,
  });

  console.log(
    `[MemoryRepo] Updated payload fields on ${pointIds.length} memory point(s).`,
  );
}
