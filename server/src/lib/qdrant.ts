import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env.js';

const url = env.QDRANT_URL;
const apiKey = env.QDRANT_API_KEY;

let qdrant: QdrantClient | null = null;

/**
 * Singleton client for Qdrant vector database interactions.
 */
export function getQdrantClient(): QdrantClient {
  if (!qdrant) {
    qdrant = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
      timeout: 30000, // 30 seconds
    });
    console.log(`--- Qdrant Client Initialized at ${url} ---`);
  }
  return qdrant;
}

/**
 * Clears the Qdrant singleton reference (allows GC; HTTP connections close on process exit).
 */
export function closeQdrantClient(): void {
  qdrant = null;
}
