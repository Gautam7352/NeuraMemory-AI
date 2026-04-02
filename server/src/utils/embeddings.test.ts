import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateEmbedding,
  generateEmbeddings,
  EMBEDDING_DIMENSION,
} from './embeddings.js';
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
    (
      getOpenRouterClient as unknown as {
        mockReturnValue: (val: unknown) => void;
      }
    ).mockReturnValue({
      embeddings: {
        create: mockCreate,
      },
    });
  });

  describe('generateEmbeddings', () => {
    it('should return empty array for empty input', async () => {
      const result = await generateEmbeddings([]);
      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should filter out blank strings and return empty array if all are blank', async () => {
      const result = await generateEmbeddings(['', '   ', '\n']);
      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should call OpenRouter API and return sorted embeddings', async () => {
      const mockEmbedding1 = Array(EMBEDDING_DIMENSION).fill(0.1);
      const mockEmbedding2 = Array(EMBEDDING_DIMENSION).fill(0.2);

      // Return data out of order to test sorting
      mockCreate.mockResolvedValueOnce({
        data: [
          { index: 1, embedding: mockEmbedding2 },
          { index: 0, embedding: mockEmbedding1 },
        ],
      });

      const result = await generateEmbeddings(['text1', 'text2']);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'openai/text-embedding-3-small',
        input: ['text1', 'text2'],
      });
      expect(result).toEqual([mockEmbedding1, mockEmbedding2]);
    });

    it('should filter blank strings and call API with valid strings', async () => {
      const mockEmbedding = Array(EMBEDDING_DIMENSION).fill(0.1);

      mockCreate.mockResolvedValueOnce({
        data: [{ index: 0, embedding: mockEmbedding }],
      });

      const result = await generateEmbeddings(['', 'valid', '  ']);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'openai/text-embedding-3-small',
        input: ['valid'],
      });
      expect(result).toEqual([mockEmbedding]);
    });

    it('should wrap API errors in an AppError with status 502', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Rate Limit'));

      const error = await generateEmbeddings(['test']).catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(502);
      expect((error as AppError).message).toBe('Embedding generation failed: API Rate Limit');
    });

    it('should handle non-Error throws from API', async () => {
      mockCreate.mockRejectedValueOnce('Some string error');

      const error = await generateEmbeddings(['test']).catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe(
        'Embedding generation failed: Unknown error generating embeddings',
      );
    });
  });

  describe('generateEmbedding behaviour handled by generateEmbeddings for single strings', () => {
    it('should successfully return a single embedding array wrapped in outer array', async () => {
      const mockEmbedding = Array(EMBEDDING_DIMENSION).fill(0.5);

      mockCreate.mockResolvedValueOnce({
        data: [{ index: 0, embedding: mockEmbedding }],
      });

      const result = await generateEmbeddings(['hello world']);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'openai/text-embedding-3-small',
        input: ['hello world'],
      });
      expect(result).toEqual([mockEmbedding]);
    });

    it('should throw AppError with status 500 if text is blank (no result returned)', async () => {
      const error = await generateEmbedding('   ').catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Embedding generation returned no result.');
    });

    it('should return empty array if API somehow returns empty data', async () => {
      mockCreate.mockResolvedValueOnce({ data: [] });

      // Because '[]' won't throw until it gets returned back out, wait...
      // Actually `generateEmbeddings` expects response.data to exist and loops over it.
      // If `response.data` is empty, `response.data` is `[]`.
      // `[...response.data]` is `[]`, mapped is `[]`.
      // Returned is `[]`.
      // `generateEmbedding` will then do: `const [embedding] = await generateEmbeddings(['valid text']);`
      // `embedding` will be `undefined`.
      // And throw `AppError(500, 'Embedding generation returned no result.')`.

      const error = await generateEmbedding('valid text').catch((e) => e);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Embedding generation returned no result.');
    });
  });
});
