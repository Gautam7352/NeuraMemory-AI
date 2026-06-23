/**
 * Utility for splitting large text strings into manageable chunks
 * for LLM-based extraction.
 */

export interface ChunkingOptions {
  maxChunkSize: number;
  overlap: number;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 35000, // characters (~8.5k tokens)
  overlap: 1000, // overlap to maintain context at boundaries
};

/**
 * Splits a long string into a list of overlapping chunks.
 */
export function splitIntoChunks(
  text: string,
  options: Partial<ChunkingOptions> = {},
): string[] {
  const { maxChunkSize, overlap } = { ...DEFAULT_OPTIONS, ...options };

  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;

    // Try to find a logical breaking point (paragraph or sentence)
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end);
      if (lastParagraph > start + maxChunkSize * 0.7) {
        end = lastParagraph + 2;
      } else {
        const lastSentence = text.lastIndexOf('. ', end);
        if (lastSentence > start + maxChunkSize * 0.7) {
          end = lastSentence + 2;
        }
      }
    }

    chunks.push(text.slice(start, end).trim());

    start = end - overlap;

    // Safety guard to avoid infinite loops if overlap >= maxChunkSize
    if (start >= text.length || end >= text.length) break;
    if (start < 0) start = 0;
  }

  return chunks;
}
