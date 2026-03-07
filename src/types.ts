export interface Memory {
  content: string;
  category: "skill" | "preference" | "project" | "personal" | "goal";
  confidence: number;
}

export interface MemoryWithVector extends Memory {
  vector: number[];
}

export interface StoredMemory {
  id: string;
  content: string;
  category: string;
  confidence: number;
  enabled: boolean;
  score?: number;
}