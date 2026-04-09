import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUserMemoryById } from './memory.service.js';
import * as memoryRepository from '../repositories/memory.repository.js';
import { AppError } from '../utils/AppError.js';

vi.mock('../repositories/memory.repository.js', () => ({
  deleteMemoryById: vi.fn(),
  getMemoryPointById: vi.fn(),
  upsertMemories: vi.fn(),
  getMemoriesByUser: vi.fn(),
  deleteMemoriesByUser: vi.fn(),
  searchMemories: vi.fn(),
  updateMemoryPoint: vi.fn(),
}));

describe('memory.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteUserMemoryById', () => {
    it('should throw 403 error if memory belongs to another user', async () => {
      const userId = 'user-1';
      const pointId = 'point-1';
      const otherUserId = 'user-2';

      // Mock getMemoryPointById to return a point belonging to another user
      vi.mocked(memoryRepository.getMemoryPointById).mockResolvedValue({
        id: pointId,
        payload: {
          userId: otherUserId,
          text: 'Secret memory',
          kind: 'semantic',
          source: 'text',
          createdAt: new Date().toISOString(),
        } as unknown as Record<string, unknown>,
      });

      // The call should throw a 403 AppError
      await expect(deleteUserMemoryById(userId, pointId)).rejects.toThrow(
        AppError,
      );
      try {
        await deleteUserMemoryById(userId, pointId);
      } catch (error: unknown) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('Forbidden');
      }

      // Deletion should NOT have been called
      expect(memoryRepository.deleteMemoryById).not.toHaveBeenCalled();
    });

    it('should successfully delete memory if user owns it', async () => {
      const userId = 'user-1';
      const pointId = 'point-1';

      // Mock getMemoryPointById to return a point belonging to the same user
      vi.mocked(memoryRepository.getMemoryPointById).mockResolvedValue({
        id: pointId,
        payload: {
          userId: userId,
          text: 'My memory',
          kind: 'semantic',
          source: 'text',
          createdAt: new Date().toISOString(),
        } as unknown as Record<string, unknown>,
      });

      await deleteUserMemoryById(userId, pointId);

      // Deletion SHOULD have been called
      expect(memoryRepository.deleteMemoryById).toHaveBeenCalledWith(pointId);
    });

    it('should throw 403 error if memory does not exist', async () => {
      const userId = 'user-1';
      const pointId = 'non-existent';

      // Mock getMemoryPointById to return null
      vi.mocked(memoryRepository.getMemoryPointById).mockResolvedValue(null);

      await expect(deleteUserMemoryById(userId, pointId)).rejects.toThrow(
        AppError,
      );
      try {
        await deleteUserMemoryById(userId, pointId);
      } catch (error: unknown) {
        expect(error.statusCode).toBe(403);
      }

      expect(memoryRepository.deleteMemoryById).not.toHaveBeenCalled();
    });
  });
});
