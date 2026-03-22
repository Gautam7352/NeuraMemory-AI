import { getOpenRouterClient } from '../lib/openrouter.js';
import { AppError } from './AppError.js';

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

export const EMBEDDING_DIMENSION = 1536;

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const sanitised = texts.map((t) => t.trim()).filter(Boolean);
  if (sanitised.length === 0) return [];

  const client = getOpenRouterClient();

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: sanitised,
    });

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

export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);
  if (!embedding) {
    throw new AppError(500, 'Embedding generation returned no result.');
  }
  return embedding;
}
