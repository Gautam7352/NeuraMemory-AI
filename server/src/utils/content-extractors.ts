/**
 * Content extractors — convert raw inputs (URLs, documents) into plain text
 * that can be fed to the LLM for memory extraction.
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { AppError } from './AppError.js';
import { extractTextWithLocalOcr } from './ocr-local.js';

pdfjs.GlobalWorkerOptions.workerSrc = '';

type FirecrawlScrapeData = {
  markdown?: string | null;
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  error?: string;
  markdown?: string | null;
  data?: FirecrawlScrapeData | null;
};

function getFirecrawlApiKey(): string {
  const apiKey = env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      502,
      'FIRECRAWL_API_KEY is not configured. URL memory ingestion is unavailable.',
    );
  }
  return apiKey;
}

// ---------------------------------------------------------------------------
// URL / Link content extraction
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and returns the main textual content.
 *
 * We use Firecrawl to extract high-quality markdown directly from the website.
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const firecrawl = new FirecrawlApp({
      apiKey: process.env['FIRECRAWL_API_KEY'] || '',
    });

    // Attempt to scrape the URL, asking Firecrawl for markdown format
    const response = (await firecrawl.scrape(url, {
      formats: ['markdown'],
    })) as {
      success: boolean;
      error?: string;
      markdown?: string;
      data?: { markdown?: string };
    };

    if (response.success === false) {
      throw new AppError(
        422,
        `Failed to scrape URL with Firecrawl: ${response.error || 'Unknown error'}`,
      );
    }

    // `response.markdown` is typically where the markdown format appears.
    // In some older versions, it might be nested under `data`.
    const markdown =
      response.markdown || (response.data && response.data.markdown) || '';

    if (!markdown) {
      return '';
    }

    return markdown;
  } catch (err) {
    if (err instanceof AppError) throw err;

    const message =
      err instanceof Error ? err.message : 'Unknown error fetching URL';
    throw new AppError(422, `Could not extract content from URL: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Document text extraction
// ---------------------------------------------------------------------------

/**
 * Extracts text from an uploaded document buffer.
 *
 * Supported MIME types:
 *  - text/plain, text/markdown      → decode UTF‑8
 *  - application/pdf                 → basic text layer extraction
 *  - application/vnd.openxmlformats‑officedocument.wordprocessingml.document
 *                                    → extract raw text from docx XML
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  switch (mimetype) {
    case 'text/plain':
    case 'text/markdown': {
      const text = buffer.toString('utf-8');
      const MAX_PLAIN_TEXT_BYTES = 500_000; // ~500 KB
      if (Buffer.byteLength(text, 'utf-8') > MAX_PLAIN_TEXT_BYTES) {
        throw new AppError(413, 'Plain-text file exceeds the 500 KB limit.');
      }
      return text;
    }

    case 'application/pdf':
      return extractTextFromPdfBuffer(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractTextFromDocxBuffer(buffer);

    default:
      throw new AppError(
        415,
        `Unsupported document type: ${mimetype}. Supported types: PDF, DOCX, TXT, MD.`,
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Very lightweight PDF text extraction.
 *
 * PDF files store text in stream objects between `BT` (Begin Text) and `ET`
 * (End Text) markers. Text‑showing operators like `Tj`, `TJ`, `'`, and `"`
 * carry the actual string content inside parentheses `(…)`.
 *
 * This extractor:
 * 1. Converts the raw buffer to a latin‑1 string (PDFs are byte‑oriented).
 * 2. Finds all `BT … ET` blocks.
 * 3. Inside each block, captures strings enclosed in `(…)`.
 * 4. Joins everything with spaces / newlines.
 *
 * Limitations:
 * - Only works with PDFs whose text layer is NOT compressed (FlateDecode, etc.).
 * - Scanned / image‑only PDFs will return empty text.
 * - Complex encodings (CIDFont, ToUnicode CMaps) are not decoded.
 *
 * For production‑grade extraction, swap this with `pdf-parse` or `pdfjs-dist`.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  const raw = buffer.toString('latin1');

  const textBlocks: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = btEtRegex.exec(raw)) !== null) {
    const block = blockMatch[1];
    if (!block) continue;

    // Match strings inside parentheses — the text operands of Tj / TJ / ' / "
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch: RegExpExecArray | null;

    while ((strMatch = stringRegex.exec(block)) !== null) {
      const decoded = strMatch[1];
      if (decoded) {
        textBlocks.push(decoded);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[PDF] pdfjs-dist extraction failed:', msg);
    }
  }

  const text = textBlocks.join(' ').trim();

  if (!text) {
    throw new AppError(
      422,
      'Could not extract text from the PDF. The file may be scanned/image‑based or use compressed text streams. Please provide a text‑based PDF.',
    );
  }

  return text;
}

async function extractTextWithPdfJs(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) =>
        item && typeof item === 'object' ? (item as { str?: string }).str : '',
      )
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      );

    if (strings.length > 0) {
      pages.push(strings.join(' '));
    }
  }

  // A quick‑and‑dirty approach: extract everything from the buffer as UTF‑8
  // and look for the XML content between `<?xml` and the end of the entry.
  const asString = buffer.toString('utf-8');

  // Find the XML portion of word/document.xml
  const xmlStart = asString.indexOf('<?xml', idx);
  if (xmlStart === -1) {
    throw new AppError(
      422,
      'Could not parse the DOCX file — no XML content found.',
    );
  }

  // Find the end of the XML: look for the next PK signature or end of buffer
  const nextPk = asString.indexOf('PK', xmlStart + 10);
  const xmlContent =
    nextPk === -1 ? asString.slice(xmlStart) : asString.slice(xmlStart, nextPk);

  // Strip XML tags, decode entities, collapse whitespace
  const text = xmlContent
    .replace(/<w:p[^>]*>/g, '\n') // paragraph boundaries → newlines
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    throw new AppError(
      422,
      'Could not extract text from the DOCX file. The document may be empty.',
    );
  }

  return text;
}
