/**
 * Types for the memory extraction and storage pipeline.
 */

// ---------------------------------------------------------------------------
// LLM extraction output shapes
// ---------------------------------------------------------------------------

export interface Bubble {
  text: string;
  importance: number;
}

export interface ExtractedMemories {
  semantic: string[];
  bubbles: Bubble[];
}

// ---------------------------------------------------------------------------
// A single memory ready to be embedded and stored
// ---------------------------------------------------------------------------

export type MemoryKind = 'semantic' | 'bubble';

export interface MemoryEntry {
  /** The raw text of the memory (e.g. "User's name is Samiksha") */
  text: string;
  kind: MemoryKind;
  /** Only present for bubbles */
  importance?: number;
}

// ---------------------------------------------------------------------------
// Record persisted in the vector database
// ---------------------------------------------------------------------------

export interface StoredMemoryPayload {
  userId: string;
  text: string;
  kind: MemoryKind;
  importance: number;
  source: MemorySource;
  /** Original source reference (URL, filename, etc.) */
  sourceRef?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Input source types — one per route
// ---------------------------------------------------------------------------

export type MemorySource = 'text' | 'document' | 'link';

export interface PlainTextInput {
  text: string;
  userId: string;
}

export interface DocumentInput {
  userId: string;
  /** Original filename for reference */
  filename: string;
  /** MIME type of the uploaded file */
  mimetype: string;
  /** Buffer containing the raw file bytes */
  buffer: Buffer;
}

export interface LinkInput {
  url: string;
  userId: string;
}

// ---------------------------------------------------------------------------
// Standard API response shape for memory operations
// ---------------------------------------------------------------------------

export interface MemoryResponse {
  success: boolean;
  message: string;
  data?: {
    memoriesStored: number;
    semantic: string[];
    bubbles: Bubble[];
  };
}
