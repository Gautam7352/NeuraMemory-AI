import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  MONGODB_URI: z.string().url(),
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API Key is required'),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
  OPENROUTER_REFERER: z.string().url().optional(),
  OPENROUTER_TITLE: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d').transform(val => val.split('#')[0]!.trim()),
  UNSTRUCTURED_API_URL: z
    .string()
    .url()
    .default('https://platform.unstructuredapp.io/api/v1'),
  UNSTRUCTURED_API_KEY: z.string().min(1).optional(),
  UNSTRUCTURED_TIMEOUT_MS: z.string().optional(),
  OCR_ENABLE_LOCAL_FALLBACK: z.string().default('true'),
  OCR_TESSERACT_LANG: z.string().default('eng'),
  OCR_FORCE: z.string().default('false'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
