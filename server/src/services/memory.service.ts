/**
 * Memory service — the orchestration layer for the memory pipeline.
 *
 * Pipeline steps:
 *  1. Extract raw text from the input source (text / document / URL).
 *  2. Send the text to the LLM to extract semantic facts and episodic bubbles.
 *  3. Generate embeddings for each extracted memory.
 *  4. Persist the embedded memories in the vector database.
 */

import { extractMemories } from '../utils/extract.js';
import { generateEmbeddings } from '../utils/embeddings.js';
import { extractTextFromUrl, extractTextFromDocument } from '../utils/content-extractors.js';
import {
  upsertMemories,
  getMemoriesByUser,
  deleteMemoriesByUser,
  searchMemories,
} from '../repositories/memory.repository.js';
import { AppError } from '../utils/AppError.js';
import type {
  PlainTextInput,
  DocumentInput,
  LinkInput,
  MemoryResponse,
  MemoryEntry,
  MemorySource,
  StoredMemoryPayload,
} from '../types/memory.types.js';

// ---------------------------------------------------------------------------
// Core pipeline — shared across all sources
// ---------------------------------------------------------------------------

/**
 * The shared tail of the pipeline: extract → embed → store.
 *
 * @param rawText  The text to process (already extracted from source).
 * @param userId   Owner of the memories.
 * @param source   How the text was ingested.
 * @param sourceRef Optional reference (URL, filename).
 */
async function processText(
  rawText: string,
  userId: string,
  source: MemorySource,
  sourceRef?: string,
): Promise<MemoryResponse> {
  // 1. Guard: nothing to process
  if (!rawText.trim()) {
    return {
      success: true,
      message: 'No content to extract memories from.',
      data: { memoriesStored: 0, semantic: [], bubbles: [] },
    };
  }

  // 2. LLM extraction
  const extracted = await extractMemories(rawText);

  // Flatten into a unified list of memory entries
  const entries: MemoryEntry[] = [
    ...extracted.semantic.map(
      (text): MemoryEntry => ({ text, kind: 'semantic' }),
    ),
    ...extracted.bubbles.map(
      (b): MemoryEntry => ({ text: b.text, kind: 'bubble', importance: b.importance }),
    ),
  ];

  if (entries.length === 0) {
    return {
      success: true,
      message: 'Text processed but no extractable memories found.',
      data: { memoriesStored: 0, semantic: [], bubbles: [] },
    };
  }

  // 3. Generate embeddings for all entries in a single batch
  const texts = entries.map((e) => e.text);
  const vectors = await generateEmbeddings(texts);

  if (vectors.length !== entries.length) {
    throw new AppError(
      500,
      `Embedding count mismatch: expected ${entries.length}, got ${vectors.length}.`,
    );
  }

  // 4. Build Qdrant points
  const now = new Date().toISOString();
  const points = entries.map((entry, i) => ({
    vector: vectors[i]!,
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

  // 5. Persist
  await upsertMemories(points);

  return {
    success: true,
    message: `Successfully stored ${entries.length} memor${entries.length === 1 ? 'y' : 'ies'}.`,
    data: {
      memoriesStored: entries.length,
      semantic: extracted.semantic,
      bubbles: extracted.bubbles,
    },
  };
}

// ---------------------------------------------------------------------------
// Source‑specific entry points
// ---------------------------------------------------------------------------

/**
 * Process plain text input.
 */
export async function processPlainText(
  input: PlainTextInput,
): Promise<MemoryResponse> {
  return processText(input.text, input.userId, 'text');
}

/**
 * Process a document upload.
 */
export async function processDocument(
  input: DocumentInput,
): Promise<MemoryResponse> {
  const text = await extractTextFromDocument(input.buffer, input.mimetype);
  return processText(text, input.userId, 'document', input.filename);
}

/**
 * Process a URL / link.
 */
export async function processLink(
  input: LinkInput,
): Promise<MemoryResponse> {
  const text = await extractTextFromUrl(input.url);
  return processText(text, input.userId, 'link', input.url);
}

// ---------------------------------------------------------------------------
// Read / Delete proxies (thin wrappers so controllers don't import repos)
// ---------------------------------------------------------------------------

export async function getUserMemories(
  userId: string,
  options?: { kind?: string; source?: MemorySource; limit?: number },
): Promise<StoredMemoryPayload[]> {
  return getMemoriesByUser(userId, options);
}

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
