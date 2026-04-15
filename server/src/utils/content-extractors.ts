/**
 * Content extractors — convert raw inputs (URLs, documents) into plain text
 * that can be fed to the LLM for memory extraction.
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { AppError } from './AppError.js';

// ---------------------------------------------------------------------------
// URL / Link content extraction
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and returns the main textual content.
 *
 * We use Firecrawl to extract high-quality markdown directly from the website.
 * If Firecrawl fails, we automatically fall back to a self-hosted Crawl4AI instance.
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
      throw new Error(`Firecrawl scrape block: ${response.error || 'Unknown error'}`);
    }

    const markdown =
      response.markdown || (response.data && response.data.markdown) || '';

    if (!markdown) {
      return '';
    }

    return markdown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ContentExtractor] Firecrawl failed (${message}). Falling back to Crawl4AI...`);
    
    try {
      return await extractTextWithCrawl4AI(url);
    } catch (crawlErr) {
      const crawlMsg = crawlErr instanceof Error ? crawlErr.message : String(crawlErr);
      throw new AppError(422, `Could not extract content from URL (Both Firecrawl & Crawl4AI failed). Error: ${crawlMsg}`);
    }
  }
}

/**
 * Fallback scraper using self-hosted Crawl4AI Docker container.
 */
async function extractTextWithCrawl4AI(url: string): Promise<string> {
  const baseUrl = process.env['CRAWL4AI_API_URL'] || 'http://localhost:11235';
  
  const submitRes = await fetch(`${baseUrl}/crawl/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls: url, priority: 10 }),
  });
  
  if (!submitRes.ok) {
    throw new Error(`Failed to submit job to Crawl4AI. HTTP: ${submitRes.status}`);
  }
  
  const submitData = await submitRes.json() as any;
  const taskId = submitData?.task_id;
  
  if (!taskId) {
    throw new Error(`No task_id returned from Crawl4AI payload`);
  }
  
  let attempts = 0;
  const maxAttempts = 47; // 47 * 1.5s = ~70s
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    attempts++;
    
    const statusRes = await fetch(`${baseUrl}/job/${taskId}`);
    if (!statusRes.ok) {
      console.warn(`[Crawl4AI] Status check failed: HTTP ${statusRes.status}`);
      continue;
    }
    
    const statusData = await statusRes.json() as any;
    
    if (statusData?.status === 'completed') {
      // Result object is heavily nested in crawl4ai output sometimes
      // Typically: statusData.result.markdown or statusData.result[0].markdown 
      let markdown = '';
      if (statusData.result) {
        if (Array.isArray(statusData.result)) {
           markdown = statusData.result[0]?.markdown || statusData.result[0]?.html || '';
        } else {
           markdown = statusData.result.markdown || statusData.result.html || '';
        }
      }
      return markdown;
    } else if (statusData?.status === 'failed') {
      throw new Error(`Crawl4AI job explicitly failed: ${statusData.error || 'Unknown error'}`);
    }
  }
  
  throw new Error(`Crawl4AI job timed out after 70 seconds`);
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
    case 'text/markdown':
      return buffer.toString('utf-8');

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

/**
 * Very lightweight DOCX text extraction.
 *
 * A `.docx` file is a ZIP archive. The main document text lives inside
 * `word/document.xml`. We locate that entry, extract it, strip XML tags,
 * and return the raw text content.
 *
 * Limitations:
 * - Only extracts from `word/document.xml` — headers, footers, footnotes,
 *   and embedded charts are ignored.
 * - Images are ignored.
 *
 * For production use, swap with a library like `mammoth` or `docx-parser`.
 */
function extractTextFromDocxBuffer(buffer: Buffer): string {
  // DOCX = ZIP. The ZIP local file header signature is PK\x03\x04.
  // We scan for the `word/document.xml` entry, find its data, and strip XML.
  const marker = 'word/document.xml';
  const idx = buffer.indexOf(marker);

  if (idx === -1) {
    throw new AppError(
      422,
      'The uploaded DOCX file appears to be malformed — could not locate word/document.xml.',
    );
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
