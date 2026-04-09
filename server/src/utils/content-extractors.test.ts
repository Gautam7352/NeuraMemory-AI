import { describe, it, expect } from 'vitest';
import { extractTextFromDocument } from './content-extractors.js';
import { AppError } from './AppError.js';

describe('extractTextFromDocument', () => {
  describe('text/plain and text/markdown', () => {
    it('should extract plain text correctly', async () => {
      const text = 'Hello, world!';
      const buffer = Buffer.from(text, 'utf-8');
      const result = await extractTextFromDocument(buffer, 'text/plain');
      expect(result).toBe(text);
    });

    it('should extract markdown text correctly', async () => {
      const text = '# Markdown\n\nSome text';
      const buffer = Buffer.from(text, 'utf-8');
      const result = await extractTextFromDocument(buffer, 'text/markdown');
      expect(result).toBe(text);
    });
  });

  describe('application/pdf', () => {
    it('should extract text from uncompressed PDF markers', async () => {
      const pdfString = '... BT (Hello) ET ... BT (World) ET ...';
      const buffer = Buffer.from(pdfString, 'latin1');
      const result = await extractTextFromDocument(buffer, 'application/pdf');
      expect(result).toBe('Hello World');
    });

    it('should throw 422 if no text is extracted from PDF', async () => {
      const pdfString = '... Some other data ...';
      const buffer = Buffer.from(pdfString, 'latin1');
      await expect(
        extractTextFromDocument(buffer, 'application/pdf'),
      ).rejects.toThrowError(
        new AppError(
          422,
          'Could not extract text from the PDF. The file may be scanned/image‑based or use compressed text streams. Please provide a text‑based PDF.',
        ),
      );
    });
  });

  describe('application/vnd.openxmlformats-officedocument.wordprocessingml.document', () => {
    it('should extract and format text from word/document.xml', async () => {
      const docxData = `PK...word/document.xml...<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r><w:t>Hello</w:t></w:r>
          </w:p>
          <w:p>
            <w:r><w:t>World</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>PK...other files...`;

      const buffer = Buffer.from(docxData, 'utf-8');
      const result = await extractTextFromDocument(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      // The implementation collapses whitespace and Replaces `<w:p>` with `\n` and strips tags.
      // With our input, `<w:p>` gets converted to `\n`, then `<[^>]+>` strips `<w:r>`, `<w:t>`, etc.
      // So "Hello" and "World" should be joined by newlines.
      expect(result).toBe('Hello\n\nWorld');
    });

    it('should handle XML entities properly', async () => {
      const docxData = `word/document.xml <?xml> <w:p>A &amp; B &lt; C &gt; D &quot; E &#39; F</w:p> PK`;
      const buffer = Buffer.from(docxData, 'utf-8');
      const result = await extractTextFromDocument(
        buffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(result.trim()).toBe('A & B < C > D " E \' F');
    });

    it('should throw 422 if word/document.xml is missing', async () => {
      const docxData = `PK...other file...PK`;
      const buffer = Buffer.from(docxData, 'utf-8');
      await expect(
        extractTextFromDocument(
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).rejects.toThrowError(
        new AppError(
          422,
          'The uploaded DOCX file appears to be malformed — could not locate word/document.xml.',
        ),
      );
    });

    it('should throw 422 if XML content is missing', async () => {
      const docxData = `word/document.xml But no xml tag PK`;
      const buffer = Buffer.from(docxData, 'utf-8');
      await expect(
        extractTextFromDocument(
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).rejects.toThrowError(
        new AppError(
          422,
          'Could not parse the DOCX file — no XML content found.',
        ),
      );
    });

    it('should throw 422 if the document is empty after stripping tags', async () => {
      const docxData = `word/document.xml <?xml> <w:p></w:p> PK`;
      const buffer = Buffer.from(docxData, 'utf-8');
      await expect(
        extractTextFromDocument(
          buffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).rejects.toThrowError(
        new AppError(
          422,
          'Could not extract text from the DOCX file. The document may be empty.',
        ),
      );
    });
  });

  describe('unsupported mimetype', () => {
    it('should throw 415 error', async () => {
      const buffer = Buffer.from('some data', 'utf-8');
      await expect(
        extractTextFromDocument(buffer, 'image/png'),
      ).rejects.toThrowError(
        new AppError(
          415,
          'Unsupported document type: image/png. Supported types: PDF, DOCX, TXT, MD.',
        ),
      );
    });
  });
});
