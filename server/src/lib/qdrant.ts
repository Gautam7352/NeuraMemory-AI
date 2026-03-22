import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env.js';

const url = env.QDRANT_URL;
const apiKey = env.QDRANT_API_KEY;

let qdrant: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrant) {
    qdrant = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
    });
    console.log(`--- Qdrant Client Initialized at ${url} ---`);
  }
  return qdrant;
}

export function closeQdrantClient(): void {
  qdrant = null;
}
