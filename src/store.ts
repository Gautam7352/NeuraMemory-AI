import { QdrantClient } from "@qdrant/js-client-rest";
import { MemoryWithVector, StoredMemory } from "./types.js";
import {QDRANT_URL} from "./config.js"




const client = new QdrantClient({ url: QDRANT_URL});

const COLLECTION_NAME = "memories";
const VECTOR_SIZE = 768; // nomic-embed-text = 768 dimensions

export async function setupCollection(): Promise<void> {
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );

  if (!exists) {
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });
  }
}

export async function saveMemories(
  memories: MemoryWithVector[]
): Promise<void> {
  const points = memories.map((memory, index) => ({
    id: Date.now() + index,
    vector: memory.vector,
    payload: {
      content: memory.content,
      category: memory.category,
      confidence: memory.confidence,
      enabled: true,
      created_at: new Date().toISOString(),
    },
  }));

  await client.upsert(COLLECTION_NAME, { points });
}

export async function searchMemories(
  queryVector: number[],
  limit: number = 5
): Promise<StoredMemory[]> {
  const results = await client.search(COLLECTION_NAME, {
    vector: queryVector,
    limit,
    filter: {
      must: [{ key: "enabled", match: { value: true } }],
    },
    with_payload: true,
  });

  return results.map((r) => ({
    id: String(r.id),
    content: r.payload?.content as string,
    category: r.payload?.category as string,
    confidence: r.payload?.confidence as number,
    enabled: r.payload?.enabled as boolean,
    score: r.score,
  }));
}