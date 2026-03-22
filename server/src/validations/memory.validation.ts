import { z } from 'zod';

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

export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
] as const;

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
