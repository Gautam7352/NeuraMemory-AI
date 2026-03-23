
## NeuraMemory AI

NeuraMemory AI is an intelligent system designed to augment human memory and knowledge management using advanced AI. It acts like a “second brain,” helping you save, organize, and find information easily, while understanding context, linking related ideas, and giving smart summaries and insights.

**Key Features:**

- **Full-Stack Web Application** with a user-friendly chatbot interface.
- **Secure Authentication:** Includes login and signup functionality for safe user access.
- **Multi-Modal Interaction:** Users can interact via text, links, files, and documents.
- **Memory Management:**
	- All chats are stored as memories.
	- Memories are displayed as cards on the **Manage Memory** page.
	- Users can **add, update, or delete memories** easily.
- **Conversational Memory:** Talk to your stored memories anytime.
- **Central AI Hub:** Acts as a unified interface connecting multiple AI tools and services.


## Features

- Authenticate with JWT via `httpOnly` cookies or `Authorization: Bearer` tokens.
- Enforce user-scoped authorization on all memory operations.
- Ingest memories from text, URLs, and uploaded documents.
- Parse PDF, DOCX, TXT, and Markdown documents.
- Extract `semantic` and `bubble` memory entries using LLMs.
- Generate embeddings and store vectors in Qdrant.
- Retrieve memories with `kind`, `source`, `limit`, and `offset` filters.
- Delete memories by ID or reset all user memories.
- Access OpenAPI docs via Swagger UI in non-production mode.
- Support MCP transport at `/api/v1/mcp`.


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

cd server
npm install

cd ../client
npm install

cd ..
docker compose up -d mongodb qdrant
```

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Endpoints:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

For more details, see:

* [Server Documentation](https://github.com/NeuraMemoryAI/NeuraMemory-AI/blob/main/server/docs/README.md)
* [API Documentation](https://github.com/NeuraMemoryAI/NeuraMemory-AI/blob/main/server/docs/API.md)
* [Docker Guide](https://github.com/NeuraMemoryAI/NeuraMemory-AI/blob/main/DOCKER.md)

### Environment variables

```bash
cp server/.env.example server/.env
```

```env
MONGODB_URI=mongodb://localhost:27017/neuramemory
QDRANT_URL=http://localhost:6333
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_secret_with_minimum_32_characters
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
- Database: MongoDB (user/account data), Qdrant (vector storage)
- AI: OpenRouter (memory extraction and embeddings)
- Processing: Firecrawl, pdfjs-dist, Mammoth, local OCR fallback
- Tooling: ESLint, Prettier, Vitest, Docker Compose
