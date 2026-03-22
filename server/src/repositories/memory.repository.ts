import { randomUUID } from 'node:crypto';
import { getQdrantClient } from '../lib/qdrant.js';
import { EMBEDDING_DIMENSION } from '../utils/embeddings.js';
import type {
  StoredMemoryPayload,
  MemorySource,
} from '../types/memory.types.js';

const COLLECTION_NAME = 'memories';

let collectionReady = false;

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

export interface UpsertMemoryPoint {
  vector: number[];
  payload: StoredMemoryPayload;
}

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

export async function deleteMemoryById(pointId: string): Promise<void> {
  await ensureCollection();
  const client = getQdrantClient();

  await client.delete(COLLECTION_NAME, {
    wait: true,
    points: [pointId],
  });
}

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

  if (!results.length) return null;

  return {
    id: String(results[0]!.id),
    payload: results[0]!.payload as unknown as StoredMemoryPayload,
  };
}

export interface MemoryStatsResult {
  total: number;
  byKind: { semantic: number; bubble: number };
  bySource: { text: number; link: number; document: number };
}

export async function getMemoryStats(userId: string): Promise<MemoryStatsResult> {
  await ensureCollection();
  const client = getQdrantClient();

  const userFilter = { must: [{ key: 'userId', match: { value: userId } }] };

  const [total, semantic, bubble, textSrc, linkSrc, docSrc] = await Promise.all([
    client.count(COLLECTION_NAME, { filter: userFilter }),
    client.count(COLLECTION_NAME, { filter: { must: [...userFilter.must, { key: 'kind', match: { value: 'semantic' } }] } }),
    client.count(COLLECTION_NAME, { filter: { must: [...userFilter.must, { key: 'kind', match: { value: 'bubble' } }] } }),
    client.count(COLLECTION_NAME, { filter: { must: [...userFilter.must, { key: 'source', match: { value: 'text' } }] } }),
    client.count(COLLECTION_NAME, { filter: { must: [...userFilter.must, { key: 'source', match: { value: 'link' } }] } }),
    client.count(COLLECTION_NAME, { filter: { must: [...userFilter.must, { key: 'source', match: { value: 'document' } }] } }),
  ]);

  return {
    total: total.count,
    byKind: { semantic: semantic.count, bubble: bubble.count },
    bySource: { text: textSrc.count, link: linkSrc.count, document: docSrc.count },
  };
}

export async function updateMemoryById(
  id: string,
  text: string,
  vector: number[],
  existingPayload: StoredMemoryPayload,
): Promise<void> {
  await ensureCollection();
  const client = getQdrantClient();

  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id,
        vector,
        payload: { ...existingPayload, text } as unknown as Record<string, unknown>,
      },
    ],
  });
}
