/**
 * LLM-powered memory extraction.
 *
 * Sends text to the configured OpenRouter model alongside the system prompt,
 * and parses the structured JSON response into `ExtractedMemories`.
 */

import { getOpenRouterClient } from '../lib/openrouter.js';
import systemPrompt from './systemPrompt.js';
import { AppError } from './AppError.js';
import type { ExtractedMemories } from '../types/memory.types.js';

/** The model to use for extraction — tunable via env in the future */
const EXTRACTION_MODEL = 'google/gemini-2.0-flash-001';

/** Maximum input text length sent to the LLM (characters) */
const MAX_INPUT_LENGTH = 80_000;

/**
 * Extract semantic facts and episodic bubbles from arbitrary text.
 *
 * @param text  The raw text to extract memories from.
 * @returns     Parsed `ExtractedMemories` with `semantic` and `bubbles` arrays.
 * @throws      `AppError` if the LLM call or response parsing fails.
 */
export async function extractMemories(
  text: string,
): Promise<ExtractedMemories> {
  if (!text.trim()) {
    return { semantic: [], bubbles: [] };
  }

  // Guard against excessively large inputs
  const truncatedText =
    text.length > MAX_INPUT_LENGTH
      ? text.slice(0, MAX_INPUT_LENGTH) + '\n\n[…truncated]'
      : text;

  const client = getOpenRouterClient();

  try {
    const completion = await client.chat.completions.create({
      model: EXTRACTION_MODEL,
      temperature: 0.1, // keep output deterministic
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `--- LATEST INTERACTION ---\n${truncatedText}\n--- END ---`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      console.warn(
        '[ExtractMemories] LLM returned empty response — treating as no memories.',
      );
      return { semantic: [], bubbles: [] };
    }

    return parseExtractionResponse(raw);
  } catch (err) {
    if (err instanceof AppError) throw err;

    const msg =
      err instanceof Error ? err.message : 'Unknown error during extraction';
    console.error('[ExtractMemories] LLM call failed:', msg);
    throw new AppError(502, `Memory extraction failed: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses and validates the raw JSON string returned by the LLM.
 * Gracefully handles malformed or unexpected shapes.
 */
function parseExtractionResponse(raw: string): ExtractedMemories {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      console.warn(
        '[ExtractMemories] LLM returned non-object JSON — treating as empty.',
      );
      return { semantic: [], bubbles: [] };
    }

    const obj = parsed as Record<string, unknown>;

    // --- semantic ---
    const semantic: string[] = [];
    if (Array.isArray(obj['semantic'])) {
      for (const item of obj['semantic']) {
        if (typeof item === 'string' && item.trim()) {
          semantic.push(item.trim());
        }
      }
    }

    // --- bubbles ---
    const bubbles: ExtractedMemories['bubbles'] = [];
    if (Array.isArray(obj['bubbles'])) {
      for (const item of obj['bubbles']) {
        if (
          typeof item === 'object' &&
          item !== null &&
          'text' in item &&
          typeof (item as Record<string, unknown>)['text'] === 'string'
        ) {
          const bubbleItem = item as Record<string, unknown>;
          const text = (bubbleItem['text'] as string).trim();
          const importance =
            typeof bubbleItem['importance'] === 'number'
              ? Math.max(0, Math.min(1, bubbleItem['importance']))
              : 0.5;

          if (text) {
            bubbles.push({ text, importance });
          }
        }
      }
    }

    return { semantic, bubbles };
  } catch {
    console.warn(
      '[ExtractMemories] Failed to parse LLM response as JSON:',
      raw.slice(0, 200),
    );
    return { semantic: [], bubbles: [] };
  }
}