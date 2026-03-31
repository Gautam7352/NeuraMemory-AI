# NeuraMemory AI: Persistent Memory Layer for the AI age

"Intelligence without memory is just a series of disconnected thoughts."

NeuraMemory AI is an open-source, high-performance memory engine designed to give Large Language Models (LLMs) a persistent, cross-session, and model-agnostic long-term memory. It acts like a “second brain,” helping you save, organize, and find information easily, while understanding context, linking related ideas, and giving smart summaries and insights.

## The Problem

Currently, interacting with AI feels like meeting a brilliant person who gets a concussion every time you close the chat window. This creates three critical failures in the developer and user experience:

1. **The Context Window "Token Tax"**  
Every time you start a new session, you have to re-feed the AI your project structure, coding preferences, or personal history. This wastes thousands of tokens and real money on redundant processing. Current context windows are growing, but they are still a "leaky bucket". Once the limit is reached, the oldest (and often most important) context is discarded.

2. **The Model Silo Problem**  
Your "relationship" with an AI is trapped inside a single platform. If you move from Gemini to Claude or a local Llama model, you lose all previous context. There is no interoperable layer for personal or professional AI memory.

3. **The "Grounding" Gap**  
Generic LLMs lack "Personal Grounding." They know how to write code, but they don't know your specific project's architectural quirks unless you explicitly tell them every single time.

## What NeuraMemory-AI Solves

1. **Massive Token Efficiency**  
By using Retrieval-Augmented Generation (RAG) specifically for personal history, NeuraMemory can represent years of interaction in just a few hundred tokens. It solves the "Lost-in-the-Middle" phenomenon by ensuring only the most semantically relevant data is placed in the LLM's "Working Memory."

2. **User-Centric Sovereignty**  
In a world where big tech companies want to own your "digital twin," NeuraMemory is Local-First. You own your memory database. It can be hosted on your local machine or a private server, ensuring that your "Personal Context" never becomes someone else's training data.

3. **Model Agnosticism**  
NeuraMemory is designed with a Universal API. Whether you are using a Go-based backend, a React frontend, or a CLI tool, you can hook into the same memory stream. It bridges the gap between different AI providers, making your personal context portable.

4. **Hierarchical Memory Management**  
Unlike simple databases, NeuraMemory distinguishes between:

    - **Episodic Memory:**  
     Specific events (e.g., "We fixed the bug in the auth controller yesterday").
    - **Semantic Memory:**  
    General facts (e.g., "I prefer using functional programming patterns in TypeScript").
    - **Procedural Memory:**  
    How you like things done (e.g., "Always use snake_case for database schemas").

## Key Features

- **Multi-Modal Interaction:** Users can interact via text, links, files, and documents.
- **Memory Management:**
  - All chats are stored as memories.
  - Memories are displayed as cards on the **Manage Memory** page.
  - Users can **add, update, or delete memories** easily.
- **Conversational Memory:** Talk to your stored memories anytime.
- **Central AI Hub:** Acts as a unified interface connecting multiple AI tools and services.

## How to Run

### Quick commands (Make + Docker)

```bash
make dev          # Start development environment
make dev-down     # Stop development environment
make prod-up      # Start production services
make prod-down    # Stop production services
make logs         # View logs
make clean        # Stop and remove containers
```

```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker compose up -d
docker compose down

# View logs
docker compose logs -f
```

### Local setup

```bash
git clone https://github.com/Gautam7352/NeuraMemory-AI.git

cd NeuraMemory-AI

cp server/.env.example server/.env

cp client/.env.example client/.env.production

make dev
```

Endpoints:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

For more details, see:

- [Server Documentation](server/docs/README.md)
- [API Documentation](server/docs/API.md)
- [Docker Guide](DOCKER.md)

### Environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.production
```

## Connect MCP in Claude Desktop

**Paste in the claude desktop config:**

```json
{
  "mcpServers": {
    "memories": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://neuramemory-ai.onrender.com/api/v1/mcp?apiKey={YOUR_API_KEY}"
      ]
    }
  },
  "preferences": {
    "coworkScheduledTasksEnabled": false,
    "ccdScheduledTasksEnabled": false,
    "sidebarMode": "chat",
    "coworkWebSearchEnabled": true
  }
}
```

## Project Structure

```text
.
├── client/              # React frontend
├── server/              # Express API + services
├── docker-compose.yml
├── docker-compose.dev.yml
├── DOCKER.md
└── README.md
```

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios
- Backend: Node.js, Express, TypeScript, Zod, JWT, Multer
- Database: PostgresDB (user/account data), Qdrant (vector storage)
- AI: OpenRouter (memory extraction and embeddings)
- Processing: Firecrawl, pdfjs-dist, document parsers, local OCR fallback
- Tooling: ESLint, Prettier, Vitest, Docker Compose


## Future prospects:
- To build our own "memory database" to make sure we are able to have custom architecture for this specific purpose
- To improve to code for any inefficiencies in terms of modularity and the way we handle things
- To ensure generic and custom support for as many platforms and IDEs as possible.
- To improve the architecture such that local LLMs and BYOK features are supported seamlessly (For those who want to self-host)
- Implement Installation guide for users

**[See the project details](https://neuramemory-ai-ea5s372.gamma.site/)**
