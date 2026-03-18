/**
 * Memory controllers — one handler per source type.
 *
 * Each controller:
 *  1. Validates the incoming request (Zod + multer).
 *  2. Reads `userId` from `req.user` (set by `requireAuth` middleware).
 *  3. Delegates to the memory service.
 *  4. Returns a consistent JSON response.
 *
 * Errors are forwarded to the central error handler via `next()`.
 */

import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import {
  plainTextSchema,
  linkSchema,
  documentMetaSchema,
  ALLOWED_DOCUMENT_MIMES,
} from '../../validations/memory.validation.js';
import {
  processPlainText,
  processDocument,
  processLink,
  getUserMemories,
  clearUserMemories,
} from '../../services/memory.service.js';
import { AppError } from '../../utils/AppError.js';
import type { MemorySource } from '../../types/memory.types.js';

// ---------------------------------------------------------------------------
// Helper — extract authenticated userId from req.user
// ---------------------------------------------------------------------------

function getAuthUserId(req: Request): string {
  const user = req.user;
  if (!user?.userId) {
    throw new AppError(401, 'Authentication required.');
  }
  return user.userId;
}

// ---------------------------------------------------------------------------
// POST /memories/text — Create memories from plain text
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /memories/link — Create memories from a URL
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POST /memories/document — Create memories from an uploaded document
// ---------------------------------------------------------------------------

export async function createFromDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    // Multer has already run as middleware — file is in req.file
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      throw new AppError(400, 'No file uploaded. Please attach a document.');
    }

    // Validate any extra metadata from the body (currently none required beyond userId)
    const metaResult = documentMetaSchema.safeParse(req.body);
    if (!metaResult.success) {
      throw new AppError(
        400,
        metaResult.error.errors[0]?.message ?? 'Invalid input.',
      );
    }

    // Double‑check MIME type (belt‑and‑suspenders alongside multer filter)
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
    // Translate Multer errors into AppErrors for consistent API responses
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

// ---------------------------------------------------------------------------
// GET /memories — List memories for the authenticated user
// ---------------------------------------------------------------------------

export async function getMemories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthUserId(req);

    const kind =
      typeof req.query['kind'] === 'string'
        ? req.query['kind']
        : undefined;

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

    const options: { kind?: string; source?: MemorySource; limit?: number } = { limit };
    if (kind !== undefined) options.kind = kind;
    if (source !== undefined) options.source = source;

    const memories = await getUserMemories(userId, options);

    res.status(200).json({
      success: true,
      message: `Found ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'}.`,
      data: memories,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /memories — Delete all memories for the authenticated user
// ---------------------------------------------------------------------------

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
