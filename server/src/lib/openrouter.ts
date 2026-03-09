import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

let openrouter: OpenAI;

/**
 * Singleton OpenAI client pre-configured for OpenRouter.
 */
export function getOpenRouterClient(): OpenAI {
  if (!openrouter) {
    if (!apiKey) {
      console.warn('WARNING: OPENROUTER_API_KEY is not set in environment.');
    }
    openrouter = new OpenAI({
      baseURL: baseUrl,
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER,
        'X-Title': process.env.OPENROUTER_TITLE,
      },
    });
    console.log('--- OpenRouter Client Initialized ---');
  }
  return openrouter;
}
