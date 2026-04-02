import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmbeddings, EMBEDDING_DIMENSION } from './embeddings.js';
import { getOpenRouterClient } from '../lib/openrouter.js';
import { AppError } from './AppError.js';

// Mock the openrouter dependency
vi.mock('../lib/openrouter.js', () => ({
  getOpenRouterClient: vi.fn(),
}));

describe('embeddings util', () => {
  const mockCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getOpenRouterClient as any).mockReturnValue({
      embeddings: {
        create: mockCreate,
      },
    });
  });

});
