import multer from 'multer';
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_SIZE,
} from '../validations/memory.validation.js';
import { AppError } from '../utils/AppError.js';

const storage = multer.memoryStorage();

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          415,
          `Unsupported file type: ${file.mimetype}. Allowed types: PDF, DOCX, TXT, MD.`,
        ),
      );
    }
  },
});
