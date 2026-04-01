import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const DEFAULT_TEMPLATE_ID = 'hi_res_and_enrichment';
const DEFAULT_TIMEOUT_MS = 120_000;
const INITIAL_POLL_MS = 2_000;
const MAX_POLL_MS = 10_000;

type UnstructuredJobStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'STOPPED'
  | 'FAILED';

type OutputNodeFile = {
  node_id?: string;
  file_id?: string;
};

type UnstructuredJobInfo = {
  id: string;
  status: UnstructuredJobStatus;
  input_file_ids?: string[] | null;
  output_node_files?: OutputNodeFile[] | null;
};

export function isUnstructuredConfigured(): boolean {
  return Boolean(env.UNSTRUCTURED_API_KEY);
}

function mimetypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'md':
      return 'text/markdown';
    default:
      return 'application/octet-stream';
  }
}

export async function extractTextWithUnstructured(
  buffer: Buffer,
  filename: string,
  mimetype?: string,
): Promise<string> {
  if (!env.UNSTRUCTURED_API_KEY) {
    throw new AppError(502, 'Unstructured API key is not configured for OCR.');
  }

  const resolvedMimetype = mimetype ?? mimetypeFromFilename(filename);
  const { jobId } = await submitUnstructuredJob(
    buffer,
    filename,
    resolvedMimetype,
  );
  const job = await pollUnstructuredJob(jobId);

  if (job.status !== 'COMPLETED') {
    throw new AppError(
      502,
      `Unstructured OCR job did not complete successfully (status: ${job.status}).`,
    );
  }

  const fileTargets = collectOutputTargets(job);
  if (fileTargets.length === 0) {
    throw new AppError(502, 'Unstructured OCR produced no output files.');
  }

  const downloadPromises = fileTargets.map(async (target) => {
    const output = await downloadUnstructuredOutput(
      jobId,
      target.fileId,
      target.nodeId,
    );
    return extractTextFromUnstructuredOutput(output);
  });

  const extractedTexts = await Promise.all(downloadPromises);
  const texts = extractedTexts.filter((extracted) => extracted);

  return texts.join('\n\n').trim();
}

async function submitUnstructuredJob(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<{ jobId: string }> {
  const apiKey = env.UNSTRUCTURED_API_KEY;
  if (!apiKey) {
    throw new AppError(502, 'Unstructured API key is missing.');
  }

  const form = new FormData();
  const requestData = JSON.stringify({
    template_id: DEFAULT_TEMPLATE_ID,
  });
  form.append('request_data', requestData);
  form.append(
    'input_files',
    new Blob([new Uint8Array(buffer)], { type: mimetype }),
    filename,
  );

  const response = await fetch(`${getUnstructuredBaseUrl()}/jobs/`, {
    method: 'POST',
    headers: {
      'unstructured-api-key': apiKey,
      Accept: 'application/json',
    },
    body: form,
  });

  if (!response.ok) {
    const payload = await safeReadJson(response);
    throw new AppError(
      502,
      `Unstructured OCR job creation failed (${response.status}): ${payload ?? response.statusText}`,
    );
  }

  const data = (await response.json()) as { id?: string };
  if (!data?.id) {
    throw new AppError(
      502,
      'Unstructured OCR job creation returned no job ID.',
    );
  }

  return { jobId: data.id };
}

async function pollUnstructuredJob(
  jobId: string,
): Promise<UnstructuredJobInfo> {
  const apiKey = env.UNSTRUCTURED_API_KEY;
  if (!apiKey) {
    throw new AppError(502, 'Unstructured API key is missing.');
  }

  const timeoutMs = parseTimeoutMs(env.UNSTRUCTURED_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;
  let delayMs = INITIAL_POLL_MS;

  while (Date.now() < deadline) {
    const response = await fetch(`${getUnstructuredBaseUrl()}/jobs/${jobId}`, {
      headers: {
        'unstructured-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const payload = await safeReadJson(response);
      throw new AppError(
        502,
        `Unstructured OCR job polling failed (${response.status}): ${payload ?? response.statusText}`,
      );
    }

    const job = (await response.json()) as UnstructuredJobInfo;
    if (
      job.status === 'COMPLETED' ||
      job.status === 'FAILED' ||
      job.status === 'STOPPED'
    ) {
      return job;
    }

    await sleep(delayMs);
    delayMs = Math.min(MAX_POLL_MS, Math.round(delayMs * 1.5));
  }

  throw new AppError(
    504,
    `Unstructured OCR job timed out after ${timeoutMs} ms.`,
  );
}

async function downloadUnstructuredOutput(
  jobId: string,
  fileId: string,
  nodeId?: string,
): Promise<unknown> {
  const apiKey = env.UNSTRUCTURED_API_KEY;
  if (!apiKey) {
    throw new AppError(502, 'Unstructured API key is missing.');
  }

  const url = new URL(`${getUnstructuredBaseUrl()}/jobs/${jobId}/download`);
  url.searchParams.set('file_id', fileId);
  if (nodeId) {
    url.searchParams.set('node_id', nodeId);
  }

  const response = await fetch(url, {
    headers: {
      'unstructured-api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await safeReadJson(response);
    throw new AppError(
      502,
      `Unstructured OCR output download failed (${response.status}): ${payload ?? response.statusText}`,
    );
  }

  try {
    return await response.json();
  } catch {
    const text = await response.text();
    return text;
  }
}

function collectOutputTargets(
  job: UnstructuredJobInfo,
): Array<{ fileId: string; nodeId?: string }> {
  const targets: Array<{ fileId: string; nodeId?: string }> = [];

  const outputFiles = job.output_node_files ?? [];
  for (const output of outputFiles) {
    if (output.file_id) {
      const target: { fileId: string; nodeId?: string } = {
        fileId: output.file_id,
      };
      if (output.node_id) {
        target.nodeId = output.node_id;
      }
      targets.push(target);
    }
  }

  const inputIds = job.input_file_ids ?? [];
  for (const fileId of inputIds) {
    if (fileId && !targets.some((t) => t.fileId === fileId)) {
      targets.push({ fileId });
    }
  }

  return targets;
}

function extractTextFromUnstructuredOutput(output: unknown): string {
  if (!output) return '';

  if (Array.isArray(output)) {
    return output
      .map((item) =>
        item && typeof item === 'object'
          ? (item as { text?: string }).text
          : '',
      )
      .filter(
        (text): text is string =>
          typeof text === 'string' && text.trim().length > 0,
      )
      .join('\n');
  }

  if (typeof output === 'object') {
    const obj = output as { elements?: unknown; text?: string; data?: unknown };
    if (typeof obj.text === 'string') {
      return obj.text;
    }
    if (Array.isArray(obj.elements)) {
      return extractTextFromUnstructuredOutput(obj.elements);
    }
    if (Array.isArray(obj.data)) {
      return extractTextFromUnstructuredOutput(obj.data);
    }
  }

  if (typeof output === 'string') {
    return output;
  }

  return '';
}

function getUnstructuredBaseUrl(): string {
  const trimmed = env.UNSTRUCTURED_API_URL.replace(/\/+$/, '');
  return trimmed;
}

function parseTimeoutMs(raw?: string): number {
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function safeReadJson(response: Response): Promise<string | null> {
  try {
    const payload = await response.json();
    return JSON.stringify(payload);
  } catch {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
