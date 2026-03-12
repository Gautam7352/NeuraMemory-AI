import OpenAI from 'openai';
import { env } from '../config/env.js';

const apiKey = env.OPENROUTER_API_KEY;
const baseUrl = env.OPENROUTER_BASE_URL;

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
        ...(env.OPENROUTER_REFERER && {
          'HTTP-Referer': env.OPENROUTER_REFERER,
        }),
        ...(env.OPENROUTER_TITLE && { 'X-Title': env.OPENROUTER_TITLE }),
      },
    });
    console.log('--- OpenRouter Client Initialized ---');
  }
  return openrouter;
}
