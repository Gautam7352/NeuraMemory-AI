import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import {
  plainTextSchema,
  linkSchema,
  ALLOWED_DOCUMENT_MIMES,
} from '../../validations/memory.validation.js';
import {
  processPlainText,
  processDocument,
  processLink,
  getUserMemories,
  clearUserMemories,
  deleteUserMemoryById,
} from '../../services/memory.service.js';
import {
  getMemoryStats,
  getMemoryPointById,
  updateMemoryById,
} from '../../repositories/memory.repository.js';
import { generateEmbedding } from '../../utils/embeddings.js';
import { searchMemories } from '../../repositories/memory.repository.js';
import { AppError } from '../../utils/AppError.js';
import type { MemorySource } from '../../types/memory.types.js';

export function clampSearchLimit(n: number): number {
  if (isNaN(n) || n < 1) return 10;
  return Math.min(n, 50);
}

function getAuthUserId(req: Request): string {
  const user = req.user;
  if (!user?.userId) {
    throw new AppError(401, 'Authentication required.');
  }
  return user.userId;
}

export async function createFromText(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    const result = plainTextSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        400,
        result.error.errors[0]?.message ?? 'Invalid input.',
      );
    }

    const response = await processPlainText({ text: result.data.text, userId });
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function createFromLink(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    const result = linkSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        400,
        result.error.errors[0]?.message ?? 'Invalid input.',
      );
    }

    const response = await processLink({ url: result.data.url, userId });
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function createFromDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      throw new AppError(400, 'No file uploaded. Please attach a document.');
    }

    if (
      !(ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(file.mimetype)
    ) {
      throw new AppError(
        415,
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, MD.`,
      );
    }

    const response = await processDocument({
      userId,
      filename: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });

    res.status(201).json(response);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(413, 'File size exceeds the 10 MB limit.'));
        return;
      }
      next(new AppError(400, `Upload error: ${err.message}`));
      return;
    }

    next(err);
  }
}

export async function getMemories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    const kind =
      typeof req.query['kind'] === 'string' ? req.query['kind'] : undefined;

    const sourceRaw = req.query['source'];
    const source: MemorySource | undefined =
      typeof sourceRaw === 'string' &&
      ['text', 'document', 'link'].includes(sourceRaw)
        ? (sourceRaw as MemorySource)
        : undefined;

    const limitRaw = req.query['limit'];
    const limit =
      typeof limitRaw === 'string' && limitRaw !== '' && !isNaN(Number(limitRaw))
        ? Math.min(Math.max(Number(limitRaw), 1), 500)
        : 100;

    const offset = typeof req.query['offset'] === 'string' ? req.query['offset'] : null;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const INT_RE = /^\d+$/;
    if (offset !== null && !UUID_RE.test(offset) && !INT_RE.test(offset)) {
      throw new AppError(400, 'Invalid offset format. Must be a UUID or non-negative integer.');
    }

    const options: { kind?: string; source?: MemorySource; limit?: number; offset?: string | null } = {
      limit,
    };
    if (kind !== undefined) options.kind = kind;
    if (source !== undefined) options.source = source;
    if (offset !== null) options.offset = offset;

    const { points, nextOffset } = await getUserMemories(userId, options);

    res.status(200).json({
      success: true,
      message: `Found ${points.length} memor${points.length === 1 ? 'y' : 'ies'}.`,
      data: points,
      nextOffset,
      hasMore: nextOffset !== null,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    await clearUserMemories(userId);

    res.status(200).json({
      success: true,
      message: 'All memories deleted.',
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    const pointId = Array.isArray(req.params['id'])
      ? req.params['id'][0]
      : req.params['id'];
    if (!pointId) {
      throw new AppError(400, 'Memory ID is required.');
    }
    await deleteUserMemoryById(userId, pointId);
    res.status(200).json({ success: true, message: 'Memory deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function searchMemoriesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
    if (!q) throw new AppError(400, 'Query parameter "q" is required and must not be empty.');

    const limitRaw = typeof req.query['limit'] === 'string' ? Number(req.query['limit']) : NaN;
    const limit = clampSearchLimit(limitRaw);

    const vector = await generateEmbedding(q);
    const results = await searchMemories(vector, userId, limit);

    res.status(200).json({
      success: true,
      message: `Found ${results.length} result(s).`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    const stats = await getMemoryStats(userId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

export async function updateMemory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);
    const pointId = Array.isArray(req.params['id']) ? req.params['id'][0] : req.params['id'];
    if (!pointId) throw new AppError(400, 'Memory ID is required.');

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) throw new AppError(400, 'Text is required.');
    if (text.length > 100_000) throw new AppError(400, 'Text must not exceed 100,000 characters.');

    const existing = await getMemoryPointById(pointId);
    if (!existing) throw new AppError(404, 'Memory not found.');
    if (existing.payload.userId !== userId) throw new AppError(403, 'Forbidden.');

    const vector = await generateEmbedding(text);
    await updateMemoryById(pointId, text, vector, existing.payload);

    res.status(200).json({ success: true, message: 'Memory updated.' });
  } catch (err) {
    next(err);
  }
}
