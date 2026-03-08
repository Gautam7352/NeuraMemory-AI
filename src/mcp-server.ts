import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { embedText } from "./embedder.js";
import { setupCollection, saveMemories, searchMemories } from "./store.js";

// Initialize MCP server
const server = new McpServer({
  name: "memory-server",
  version: "1.0.0",
});

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

// ── Start server ────────────────────────────────────────────────
async function main() {
  await setupCollection();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Console output interferes with MCP JSON-RPC protocol, so we don't log here
}

main().catch(console.error);