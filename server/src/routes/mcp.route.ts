import { Router } from 'express';
import { findUserByApiKey } from '../repositories/user.repository.js';
import { McpService } from '../services/mcp.service.js';
import type { Request, Response } from 'express';

const router = Router();

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
  if (sessionId) {
    const transport = McpService.getTransport(sessionId);
    if (transport) {
      await transport.handleRequest(req, res, req.body);
      return;
    }
  }

  // ── New session → create fresh via service ──────────────────────
  const transport = await McpService.createSession(auth.userId);

  // handleRequest runs the initialize handshake and assigns session ID
  await transport.handleRequest(req, res, req.body);

  // Store after handleRequest — session ID is assigned during initialize
  McpService.saveTransport(transport);
});

// ---------------------------------------------------------------------------
// GET /api/v1/mcp — SSE stream for server → client notifications
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? McpService.getTransport(sessionId) : null;

  if (!sessionId || !transport) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  await transport.handleRequest(req, res);
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/mcp — Terminate session
// ---------------------------------------------------------------------------
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? McpService.getTransport(sessionId) : null;

  if (!sessionId || !transport) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }
  await transport.handleRequest(req, res);
});

export default router;
