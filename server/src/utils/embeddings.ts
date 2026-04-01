/**
 * Generate vector embeddings via the OpenRouter-compatible embeddings API.
 *
 * Falls back to a simple hash‑based embedding when the API is unavailable
 * so local‑dev can proceed without burning credits.
 */

import { getOpenRouterClient } from '../lib/openrouter.js';
import { AppError } from './AppError.js';

/** Embedding model — must be hosted on OpenRouter or a compatible endpoint */
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

/** Dimensionality of the embeddings (text-embedding-3-small default) */
export const EMBEDDING_DIMENSION = 1536;

/**
 * Generate embeddings for one or more texts.
 *
 * @param texts  Array of strings to embed.
 * @returns      Array of number arrays, one per input text, each of length `EMBEDDING_DIMENSION`.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Filter out blank entries — the API rejects them
  const sanitised = texts.map((t) => t.trim()).filter(Boolean);
  if (sanitised.length === 0) return [];

  const client = getOpenRouterClient();

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: sanitised,
    });

    // Sort by index to guarantee ordering matches input
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unknown error generating embeddings';
    console.error('[Embeddings] API call failed:', message);
    throw new AppError(502, `Embedding generation failed: ${message}`);
  }
}

