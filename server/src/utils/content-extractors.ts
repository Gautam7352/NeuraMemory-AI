import FirecrawlApp from '@mendable/firecrawl-js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { AppError } from './AppError.js';
import { env } from '../config/env.js';

// Disable the worker thread for pdfjs in Node.js server environments
GlobalWorkerOptions.workerSrc = '';

/**
 * Fetches a URL and returns the main textual content.
 * Includes absolute limits to prevent memory exhaustion from giant pages (max 1.5MB).
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  const MAX_CONTENT_LENGTH = 1_500_000; // 1.5MB of markdown/text is huge for a single page

  try {
    const firecrawl = new FirecrawlApp({
      apiKey: env.FIRECRAWL_API_KEY || '',
    });

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

    if (markdown.length > MAX_CONTENT_LENGTH) {
      console.warn(`[ContentExtractor] URL content truncated from ${markdown.length} to ${MAX_CONTENT_LENGTH}`);
      return markdown.slice(0, MAX_CONTENT_LENGTH);
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
  const baseUrl = env.CRAWL4AI_API_URL;
  
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
  const maxAttempts = 15; // ~22 seconds total (1.5s * 15)
  
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
  
  throw new Error(`Crawl4AI job timed out after ${attempts * 1.5} seconds. The upstream scraper is likely overloaded.`);
}

/**
 * Extracts text from an uploaded document buffer.
 *
 * Supported MIME types:
 *  - text/plain, text/markdown           → decode UTF‑8
 *  - text/csv                            → decode UTF-8
 *  - application/json                    → parsed and pretty-printed
 *  - application/pdf                     → pdfjs-dist
 *  - application/vnd.openxmlformats‑officedocument.wordprocessingml.document
 *                                        → mammoth
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  switch (mimetype) {
    case 'text/plain':
    case 'text/markdown':
    case 'text/csv':
      const csvLines = buffer.toString('utf-8').split('\n');
      return csvLines
        .map((line, idx) => `Row ${idx + 1}: ${line}`)
        .join('\n');

    case 'application/json':
      try {
        const json = JSON.parse(buffer.toString('utf-8'));
        // Convert to a more descriptive structural format for LLM ingestion
        return Object.entries(json)
          .map(([key, val]) => `Field "${key}": ${typeof val === 'object' ? JSON.stringify(val) : val}`)
          .join('\n');
      } catch {
        throw new AppError(422, 'Invalid JSON file.');
      }

    case 'application/pdf':
      return extractTextFromPdfBuffer(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractTextFromDocxBuffer(buffer);

    default:
      throw new AppError(
        415,
        `Unsupported document type: ${mimetype}. Supported: PDF, DOCX, TXT, MD, CSV, JSON.`,
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Production-grade PDF text extraction using Mozilla's pdfjs-dist.
 *
 * Handles compressed text streams (FlateDecode), CIDFonts, ToUnicode CMaps,
 * and multi-page documents. Only scanned/image-only PDFs will still fail
 * (those require OCR via the Unstructured path).
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = new Uint8Array(buffer);
    const doc = await getDocument({ data, useSystemFonts: true }).promise;

    const pageTexts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item: any) => 'str' in item)
        .map((item: any) => item.str)
        .join(' ');
      pageTexts.push(pageText.trim());
    }

    const text = pageTexts.filter(Boolean).join('\n\n').trim();

    if (!text) {
      throw new AppError(
        422,
        'Could not extract text from the PDF. The file may be scanned/image‑based. Try enabling Unstructured OCR or upload a text‑based PDF.',
      );
    }

    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError(422, `PDF extraction failed: ${msg}`);
  }
}

/**
 * Production-grade DOCX text extraction using mammoth.
 *
 * mammoth reads the full document structure (paragraphs, tables, lists,
 * headers, footers) and converts it to plain text with proper formatting.
 */
async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      throw new AppError(
        422,
        'Could not extract text from the DOCX file. The document may be empty.',
      );
    }

    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError(422, `DOCX extraction failed: ${msg}`);
  }
}

