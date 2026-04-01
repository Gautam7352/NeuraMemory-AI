import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { AppError } from './AppError.js';

const execFileAsync = promisify(execFile);
const OCR_DPI = 200;

export async function extractTextWithLocalOcr(
  buffer: Buffer,
  language: string,
): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuramemory-ocr-'));
  const pdfPath = path.join(tempDir, 'input.pdf');
  const outputPrefix = path.join(tempDir, 'page');

  try {
    await fs.writeFile(pdfPath, buffer);
    await runCommand('pdftoppm', [
      '-png',
      '-r',
      String(OCR_DPI),
      pdfPath,
      outputPrefix,
    ]);

    const images = (await fs.readdir(tempDir))
      .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
      .sort(naturalSort);

    if (images.length === 0) {
      throw new AppError(
        422,
        'Local OCR failed: no images were generated from the PDF.',
      );
    }

    const results = await Promise.all(
      images.map(async (image) => {
        const imagePath = path.join(tempDir, image);
        const { stdout } = await runCommand('tesseract', [
          imagePath,
          'stdout',
          '-l',
          language,
        ]);
        return stdout && stdout.trim() ? stdout.trim() : null;
      }),
    );

    const chunks = results.filter((chunk): chunk is string => chunk !== null);
    return chunks.join('\n\n').trim();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function runCommand(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 50 * 1024 * 1024,
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code?: string | number }).code;
      if (code === 'ENOENT') {
        throw new AppError(
          422,
          `Local OCR dependency "${command}" is not installed or not on PATH.`,
        );
      }
    }

    const message =
      err instanceof Error ? err.message : 'Unknown local OCR error';
    throw new AppError(422, `Local OCR failed (${command}): ${message}`);
  }
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
