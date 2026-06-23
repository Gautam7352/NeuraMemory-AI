import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  processPlainText,
  processLink,
  getUserMemories,
} from './memory.service.js';
import { generateEmbeddings } from '../utils/embeddings.js';

// Session tracking transport map
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Creates a fresh McpServer instance scoped to the user.
 */
function createMcpServer(userId: string): McpServer {
  const server = new McpServer(
    { name: 'neuramemory-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // -- TOOL: save_memory --
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

  // -- TOOL: save_link_memory --
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

  // -- TOOL: get_memories --
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
          const options: Record<string, any> = { limit };
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

/**
 * Service to manage MCP sessions and transports.
 */
export const McpService = {
  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    return transports.get(sessionId);
  },

  async createSession(userId: string): Promise<StreamableHTTPServerTransport> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const server = createMcpServer(userId);
    await server.connect(transport as any);

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };

    // Note: sessionId is assigned during transport.handleRequest(req, res, req.body) in the route
    return transport;
  },

  saveTransport(transport: StreamableHTTPServerTransport): void {
    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }
  },
};
