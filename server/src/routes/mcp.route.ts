import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { findUserByApiKey } from '../repositories/user.repository.js';
import {
  processPlainText,
  processLink,
  getUserMemories,
} from '../services/memory.service.js';
import { generateEmbeddings } from '../utils/embeddings.js';
import type { Request, Response } from 'express';

const router = Router();

const transports = new Map<string, StreamableHTTPServerTransport>();

async function extractUser(req: Request): Promise<{ userId: string } | null> {
  const apiKey =
    (req.query['apiKey'] as string | undefined) ||
    (req.headers['x-api-key'] as string | undefined) ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!apiKey) return null;

  const user = await findUserByApiKey(apiKey);
  if (!user) return null;

  return { userId: user._id.toString() };
}

function createMcpServer(userId: string): McpServer {
  const server = new McpServer(
    { name: 'neuramemory-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.tool(
    'save_memory',
    'Extract and save semantic and episodic memories from plain text.',
    { text: z.string().describe('The raw text to extract memories from') },
    async ({ text }) => {
      try {
        const response = await processPlainText({ text, userId });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text' as const, text: `Failed: ${msg}` }] };
      }
    },
  );

  server.tool(
    'save_link_memory',
    'Fetch content from a URL and extract memories.',
    { url: z.string().url().describe('The URL to scrape and extract from') },
    async ({ url }) => {
      try {
        const response = await processLink({ url, userId });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text' as const, text: `Failed: ${msg}` }] };
      }
    },
  );

  server.tool(
    'get_memories',
    'Retrieve stored memories. Use "query" for semantic search, or leave empty to list all.',
    {
      query: z.string().optional().describe('Optional search query for semantic retrieval'),
      kind: z.enum(['semantic', 'bubble']).optional().describe('Filter by memory kind'),
      limit: z.number().min(1).max(50).default(10).describe('Max memories to return'),
    },
    async ({ query, kind, limit }) => {
      try {
        let memories;
        if (query) {
          const [vector] = await generateEmbeddings([query]);
          if (!vector) throw new Error('Failed to generate embedding');
          const { searchMemories } = await import('../repositories/memory.repository.js');
          memories = await searchMemories(vector, userId, limit);
        } else {
          const options: any = { limit };
          if (kind) options.kind = kind;
          memories = await getUserMemories(userId, options);
        }
        const count = Array.isArray(memories) ? memories.length : memories.points.length;
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ count, memories }, null, 2) },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: 'text' as const, text: `Failed: ${msg}` }] };
      }
    },
  );

  return server;
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'NeuraMemory-MCP' });
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const auth = await extractUser(req);
  if (!auth) {
    res.status(401).json({ error: 'API Key required' });
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const server = createMcpServer(auth.userId);
  await server.connect(transport as any);

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  await transport.handleRequest(req, res, req.body);

  if (transport.sessionId) {
    transports.set(transport.sessionId, transport);
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

router.delete('/', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

export default router;
