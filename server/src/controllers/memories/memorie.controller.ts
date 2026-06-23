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
  updateMemoryById as updateMemoryByIdService,
} from '../../services/memory.service.js';
import { AppError } from '../../utils/AppError.js';
import type { MemorySource } from '../../types/memory.types.js';

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

    const { text } = plainTextSchema.parse(req.body);

    const response = await processPlainText({ text: text, userId });
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

    const { url } = linkSchema.parse(req.body);

    const response = await processLink({ url: url, userId });
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
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, MD, CSV.`,
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
      typeof limitRaw === 'string' && !isNaN(Number(limitRaw))
        ? Math.min(Math.max(Number(limitRaw), 1), 500)
        : 100;

    const offset =
      typeof req.query['offset'] === 'string' ? req.query['offset'] : null;

    const options: {
      kind?: string;
      source?: MemorySource;
      limit?: number;
      offset?: string | null;
    } = {
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

export async function updateMemoryById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    const { text } = plainTextSchema.parse(req.body);

    const pointId = Array.isArray(req.params['id'])
      ? req.params['id'][0]
      : req.params['id'];
    if (!pointId) {
      throw new AppError(400, 'Memory ID is required.');
    }

    await updateMemoryByIdService(userId, pointId, text);
    res.status(200).json({ success: true, message: 'Memory updated.' });
  } catch (err) {
    next(err);
  }
}
