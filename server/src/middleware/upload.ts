/**
 * Multer configuration for memory document uploads.
 *
 * - Stores files in memory (Buffer) — suitable for documents up to 10 MB.
 * - Validates MIME type against the allowed list.
 * - Limits file size to MAX_DOCUMENT_SIZE.
 */

import multer from 'multer';
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_SIZE,
} from '../validations/memory.validation.js';

const storage = multer.memoryStorage();

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (
      (ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed types: PDF, DOCX, TXT, MD.`,
        ),
      );
    }
  },
});
