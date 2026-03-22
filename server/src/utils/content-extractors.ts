import FirecrawlApp from '@mendable/firecrawl-js';
import { AppError } from './AppError.js';

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const firecrawl = new FirecrawlApp({
      apiKey: process.env['FIRECRAWL_API_KEY'] || '',
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
      throw new AppError(
        422,
        `Failed to scrape URL with Firecrawl: ${response.error || 'Unknown error'}`,
      );
    }

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

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const raw = buffer.toString('latin1');

  const textBlocks: string[] = [];
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = btEtRegex.exec(raw)) !== null) {
    const block = blockMatch[1];
    if (!block) continue;

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

function extractTextFromDocxBuffer(buffer: Buffer): string {
  const marker = 'word/document.xml';
  const idx = buffer.indexOf(marker);

  if (idx === -1) {
    throw new AppError(
      422,
      'The uploaded DOCX file appears to be malformed — could not locate word/document.xml.',
    );
  }

  const asString = buffer.toString('utf-8');

  const xmlStart = asString.indexOf('<?xml', idx);
  if (xmlStart === -1) {
    throw new AppError(
      422,
      'Could not parse the DOCX file — no XML content found.',
    );
  }

  const nextPk = asString.indexOf('PK', xmlStart + 10);
  const xmlContent =
    nextPk === -1 ? asString.slice(xmlStart) : asString.slice(xmlStart, nextPk);

  const text = xmlContent
    .replace(/<w:p[^>]*>/g, '\n')
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
