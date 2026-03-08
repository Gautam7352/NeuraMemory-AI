import "dotenv/config";
import { randomUUID } from "node:crypto";
import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { embedText } from "./embedder.js";
import { setupCollection, saveMemories, searchMemories } from "./store.js";

const app = express();

app.use(express.json())

// ── Session tracking ────────────────────────────────────────────
const transports = new Map<string, StreamableHTTPServerTransport>();

/** Register all tools on a new McpServer instance */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "memory-server",
    version: "1.0.0",
  });
  registerTools(server);
  return server;
}

function registerTools(server: McpServer) {
  // ── TOOL 1: Get relevant memories ──────────────────────────────
  server.tool(
    "get_memories",
    "Retrieve memories relevant to a query. Call this at the START of every conversation to get user context.",
    { query: z.string().describe("What to search for in user memories") },
    async ({ query }) => {
      const queryVector = await embedText(query);
      const memories = await searchMemories(queryVector, 5);

      if (memories.length === 0) {
        return {
          content: [{ type: "text", text: "No relevant memories found." }],
        };
      }

      const formatted = memories
        .map((m) => `[${m.category}] ${m.content} (relevance: ${m.score?.toFixed(2)})`)
        .join("\n");

      return {
        content: [{ type: "text", text: `User memories:\n${formatted}` }],
      };
    }
  );

  // ── TOOL 2: Save a new memory ───────────────────────────────────
  server.tool(
    "save_memory",
    "Save a new memory about the user. Call this when user shares something important about themselves.",
    {
      content: z.string().describe("The memory to save as a clear descriptive sentence"),
      category: z.enum(["skill", "preference", "project", "personal", "goal"])
        .describe("Category of the memory"),
    },
    async ({ content, category }) => {
      const vector = await embedText(content);
      await saveMemories([{ content, category, confidence: 1.0, vector }]);

      return {
        content: [{ type: "text", text: `Memory saved: "${content}"` }],
      };
    }
  );

  // ── TOOL 3: List all memories ───────────────────────────────────
  server.tool(
    "list_memories",
    "List all stored memories for this user.",
    {},
    async () => {
      // search with a broad query to get all memories
      const vector = await embedText("user information");
      const memories = await searchMemories(vector, 50);

      if (memories.length === 0) {
        return {
          content: [{ type: "text", text: "No memories stored yet." }],
        };
      }

      const formatted = memories
        .map((m, i) => `${i + 1}. [${m.category}] ${m.content}`)
        .join("\n");

      return {
        content: [{ type: "text", text: `All memories:\n${formatted}` }],
      };
    }
  );
} // end registerTools

// ── HTTP handlers ───────────────────────────────────────────────

app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  // Existing session → reuse its transport
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session → create a fresh McpServer + transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);

  // Store *after* handleRequest — the session ID is only assigned
  // during the initialize handshake inside handleRequest.
  if (transport.sessionId) {
    transports.set(transport.sessionId, transport);
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// ── Start ───────────────────────────────────────────────────────

async function main() {
  await setupCollection();
  app.listen(3000, () => {
    console.log("✅ Memory MCP server running on http://localhost:3000");
  });
}

main().catch(console.error);