export interface Bubble {
  text: string;
  importance: number;
}

export interface ExtractedMemories {
  semantic: string[];
  bubbles: Bubble[];
}

export type MemoryKind = 'semantic' | 'bubble';

export interface MemoryEntry {
  text: string;
  kind: MemoryKind;
  importance?: number;
}

export interface StoredMemoryPayload {
  userId: string;
  text: string;
  kind: MemoryKind;
  importance: number;
  source: MemorySource;
  sourceRef?: string;
  createdAt: string;
}

export type MemorySource = 'text' | 'document' | 'link';

export interface PlainTextInput {
  text: string;
  userId: string;
}

export interface DocumentInput {
  userId: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface LinkInput {
  url: string;
  userId: string;
}

export interface MemoryResponse {
  success: boolean;
  message: string;
  data?: {
    memoriesStored: number;
    semantic: string[];
    bubbles: Bubble[];
  };
}
