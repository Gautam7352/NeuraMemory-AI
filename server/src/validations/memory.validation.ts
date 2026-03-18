import { z } from 'zod';

// ---------------------------------------------------------------------------
// Plain‑text body
// ---------------------------------------------------------------------------

export const plainTextSchema = z.object({
  text: z
    .string({
      required_error: 'Text content is required.',
      invalid_type_error: 'Text must be a string.',
    })
    .trim()
    .min(1, 'Text content cannot be empty.')
    .max(100_000, 'Text content must not exceed 100 000 characters.'),
});

// ---------------------------------------------------------------------------
// Link body
// ---------------------------------------------------------------------------

export const linkSchema = z.object({
  url: z
    .string({
      required_error: 'URL is required.',
      invalid_type_error: 'URL must be a string.',
    })
    .trim()
    .url('Please provide a valid URL.')
    .refine(
      (u) => {
        try {
          const parsed = new URL(u);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'Only HTTP and HTTPS URLs are allowed.' },
    ),
});

// ---------------------------------------------------------------------------
// Document upload — body metadata (file itself comes via multer)
// userId is extracted from the JWT by the auth middleware, so only
// optional extra fields go here. Kept as an object for extensibility.
// ---------------------------------------------------------------------------

export const documentMetaSchema = z.object({}).passthrough();

/** Allowed MIME types for document uploads */
export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
] as const;

/** Max file size in bytes (10 MB) */
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
