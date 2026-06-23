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
  updatedAt?: string;
  conflictGroupId?: string;
  conflicted?: boolean;
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

// ---------------------------------------------------------------------------
// Conflict detection and resolution types
// ---------------------------------------------------------------------------

export type ResolutionStrategy =
  | 'recency' // keep the newer memory, delete the old one
  | 'confidence' // keep the memory with higher importance score
  | 'merge' // ask LLM to produce a single merged memory
  | 'flag'; // store both, mark them as conflicted for user review

export interface IncomingMemory {
  text: string;
  vector: number[];
  kind: MemoryKind;
  importance: number;
  source: MemorySource;
  createdAt: string;
  /** Set by the flag resolution strategy */
  conflictGroupId?: string;
  /** Set by the flag resolution strategy */
  conflicted?: boolean;
}

export interface ScoredMemory {
  id: string;
  payload: StoredMemoryPayload;
  /** Cosine similarity score returned by Qdrant (0–1) */
  score: number;
  /** Vector stored in Qdrant, available when fetched with with_vector: true */
  vector?: number[];
}

export interface ConflictAnalysis {
  /** Whether the two memories are semantically contradictory */
  isConflict: boolean;
  /** LLM confidence in the contradiction verdict (0–1) */
  confidence: number;
  /** Human-readable explanation from the LLM */
  explanation: string;
  /** Topic/subject the conflict is about (e.g. "coffee preference") */
  topic: string;
}

export interface ConflictResolution {
  action: 'store' | 'replace' | 'merge' | 'flag' | 'skip';
  /** IDs of existing Qdrant points to delete (for replace/merge) */
  pointsToDelete: string[];
  /** The memory point to store (may be merged or original) */
  pointToStore: IncomingMemory | null;
  /** Set when action = 'flag'; both memories get this marker */
  conflictGroupId?: string;
}
