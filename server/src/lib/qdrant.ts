import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.QDRANT_URL || 'http://localhost:6333';
const apiKey = process.env.QDRANT_API_KEY;

let qdrant: QdrantClient;

/**
 * Singleton client for Qdrant vector database interactions.
 */
export function getQdrantClient(): QdrantClient {
  if (!qdrant) {
    qdrant = new QdrantClient({
      url,
      apiKey,
    });
    console.log(`--- Qdrant Client Initialized at ${url} ---`);
  }
  return qdrant;
}
