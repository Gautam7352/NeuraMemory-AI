/**
 * Model Context Protocol (MCP) Router
 * Streamable HTTP transport for NeuraMemory-AI
 *
 * Uses the modern Streamable HTTP transport (POST/GET/DELETE on a single
 * endpoint) instead of SSE, following the current MCP specification.
 */

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
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

const router = Router();

// ---------------------------------------------------------------------------
// Session tracking: transport keyed by session ID
// ---------------------------------------------------------------------------
const transports = new Map<string, StreamableHTTPServerTransport>();

// ---------------------------------------------------------------------------
// Authentication helper
// ---------------------------------------------------------------------------
async function extractUser(req: Request): Promise<{ userId: string } | null> {
  const apiKey =
    (req.query['apiKey'] as string | undefined) ||
    (req.headers['x-api-key'] as string | undefined) ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!apiKey) return null;

  const user = await findUserByApiKey(apiKey);
  if (!user) return null;

  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// MCP Server factory — creates one McpServer instance per session,
// with the userId baked into closures so LLM tools never need it.
// ---------------------------------------------------------------------------
function createMcpServer(userId: string): McpServer {
  const server = new McpServer(
    { name: 'neuramemory-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // ── TOOL: save_memory ─────────────────────────────────────────
  server.tool(
    'save_memory',
    'Extract and save semantic and episodic memories from plain text.',
    { text: z.string().describe('The raw text to extract memories from') },
    async ({ text }) => {
      try {
        const response = await processPlainText({ text, userId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(response, null, 2) },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Failed: ${msg}` }],
        };
      }
    },
  );

  // ── TOOL: save_link_memory ────────────────────────────────────
  server.tool(
    'save_link_memory',
    'Fetch content from a URL and extract memories.',
    { url: z.string().url().describe('The URL to scrape and extract from') },
    async ({ url }) => {
      try {
        const response = await processLink({ url, userId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(response, null, 2) },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Failed: ${msg}` }],
        };
      }
    },
  );

  // ── TOOL: get_memories ────────────────────────────────────────
  server.tool(
    'get_memories',
    'Retrieve stored memories. Use "query" for semantic search, or leave empty to list all.',
    {
      query: z
        .string()
        .optional()
        .describe('Optional search query for semantic retrieval'),
      kind: z
        .enum(['semantic', 'bubble'])
        .optional()
        .describe('Filter by memory kind'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe('Max memories to return'),
    },
    async ({ query, kind, limit }) => {
      try {
        let memories;
        if (query) {
          const [vector] = await generateEmbeddings([query]);
          if (!vector) throw new Error('Failed to generate embedding');
          const { searchMemories } =
            await import('../repositories/memory.repository.js');
          memories = await searchMemories(vector, userId, limit);
        } else {
          const options: Record<string, unknown> = { limit };
          if (kind) options[kind] = kind;
          memories = await getUserMemories(userId, options);
        }
        const count = Array.isArray(memories)
          ? memories.length
          : memories.points.length;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ count, memories }, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Failed: ${msg}` }],
        };
      }
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Health check (public — no auth)
// ---------------------------------------------------------------------------
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'NeuraMemory-MCP' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/mcp — Main MCP endpoint (initialize + all JSON-RPC calls)
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response): Promise<void> => {
  // Authenticate
  const auth = await extractUser(req);
  if (!auth) {
    res.status(401).json({ error: 'API Key required' });
    return;
  }

  // ── Existing session → reuse transport ──────────────────────────
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // ── New session → create fresh server + transport ───────────────
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const server = createMcpServer(auth.userId);
  await server.connect(transport as Transport);

  // Set cleanup after connect (transport is fully initialized)
  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  // handleRequest runs the initialize handshake and assigns session ID
  await transport.handleRequest(req, res, req.body);

  // Store *after* handleRequest — the session ID is assigned during initialize
  if (transport.sessionId) {
    transports.set(transport.sessionId, transport);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/mcp — SSE stream for server → client notifications
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/mcp — Terminate session
// ---------------------------------------------------------------------------
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
