# NeuraMemory-AI Server

This is the backend server for NeuraMemory-AI, an AI-powered "second brain" knowledge management system that uses semantic search and LLMs to help users capture, organize, and retrieve information intelligently.

## Tech Stack

### Core

- **Runtime**: Node.js ≥24.0.0 (ESM)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.9+ (Target: ESNext, strict mode)
- **Framework**: [Express.js](https://expressjs.com/) 4.x

### Data & AI

- **Relational Database**: [PostgreSQL](https://www.postgresql.org/) 16.x
- **Vector Database**: [Qdrant](https://qdrant.tech/) (via `@qdrant/js-client-rest`)
- **LLM Gateway**: [OpenRouter](https://openrouter.ai/) (via OpenAI SDK)

### Security & Validation

- **Schema Validation**: [Zod](https://zod.dev/) 3.x
- **Password Hashing**: bcryptjs (12 rounds)
- **Authentication**: JSON Web Tokens (jsonwebtoken)

### Development Tools

- **Dev Runner**: [tsx](https://tsx.is/) (watch mode with auto-reload)
- **Build**: TypeScript Compiler (tsc)
- **Linting**: [ESLint](https://eslint.org/) 10.x (Flat Config with TypeScript)
- **Formatting**: [Prettier](https://prettier.io/) 3.x
- **Testing**: Bash test suite (`test.sh`) with curl + jq

## Project Structure

```
server/
├── src/
│   ├── config/          # Environment variable validation (Zod)
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer (PostgreSQL, Qdrant)
│   ├── middleware/      # Error handling, auth, logging
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Helper functions
│   ├── lib/             # Singleton clients (PostgreSQL, Qdrant, OpenRouter)
│   └── index.ts         # Application entry point
├── docs/                # Documentation
├── test.sh              # API test suite
├── Dockerfile           # Multi-stage production build
└── package.json
```

## Documentation

Detailed information about the project's architecture, API, and coding standards:

- [Architecture Design](ARCHITECTURE.md) — System layers, data flow (ingestion/retrieval), and infrastructure.
- [API Documentation](API.md) — Authentication methods, error handling, rate limiting, and Swagger details.
- [Best Practices](BEST_PRACTICES.md) — Coding standards, ESM, error handling patterns, and testing.

## Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

### Required

```env
# PostgreSQL Connection
DATABASE_URL=postgresql://localhost:5432/neuramemory

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# OpenRouter LLM Gateway
OPENROUTER_API_KEY=sk-or-v1-...

# JWT Authentication
JWT_SECRET=<random-string-at-least-32-characters>
```

### Optional

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Qdrant (if using cloud/secured instance)
QDRANT_API_KEY=your-api-key

# OpenRouter Configuration
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_REFERER=https://your-site.com
OPENROUTER_TITLE=NeuraMemory-AI

# JWT Configuration
JWT_EXPIRES_IN=7d
```

## Getting Started

### Prerequisites

- Node.js ≥24.0.0
- npm ≥10.0.0
- PostgreSQL (local or remote)
- Qdrant (local or remote)

### Installation

```bash
cd server
npm install
```

### Development

Start the server with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Production

Build the TypeScript code:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

## API Endpoints

We use **Swagger (OpenAPI 3.0)** for comprehensive, interactive API documentation.

- **Local Development**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Production**: Refer to your deployed server URL at `/api-docs`.

See [API.md](API.md) for an overview of authentication and common patterns.

## Testing

The server includes a comprehensive test suite (`test.sh`) that validates all API endpoints.

### Prerequisites

- `curl` - HTTP client
- `jq` - JSON processor
- Running server instance
- Running PostgreSQL and Qdrant instances

### Run Tests

```bash
# Start PostgreSQL and Qdrant (if using Docker Compose)
docker compose up -d postgres qdrant

# Start the server
npm run dev

# In another terminal, run tests
./test.sh
```

### Test Options

```bash
# Test against a different URL
BASE_URL=http://localhost:8080 ./test.sh

# Enable verbose output (show all HTTP requests/responses)
VERBOSE=true ./test.sh
```

### Test Coverage

The test suite includes **47 test cases** covering:

**Registration Tests (24):**

- ✅ Valid registration with strong password
- ✅ Duplicate email detection
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Missing field validation
- ✅ Malformed JSON handling

**Login Tests (23):**

- ✅ Successful authentication
- ✅ JWT token generation
- ✅ Wrong password rejection
- ✅ Non-existent user handling
- ✅ Input validation
- ✅ Case sensitivity checks

## Docker

### Build Image

```bash
docker build -t neuramemory-server .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://host.docker.internal:5432/neuramemory \
  -e QDRANT_URL=http://host.docker.internal:6333 \
  -e OPENROUTER_API_KEY=your-key \
  -e JWT_SECRET=your-secret \
  --name neuramemory-server \
  neuramemory-server
```

### Docker Compose

See the root `docker-compose.yml` for a complete stack setup including PostgreSQL, Qdrant, and the client application.

## Architecture Highlights

- **Layered Architecture**: Controller → Service → Repository pattern for clean separation of concerns
- **Type Safety**: Full TypeScript with strict mode enabled
- **Validation**: Zod schemas for both environment variables and request payloads
- **Error Handling**: Centralized error middleware with custom `AppError` class
- **Security**: bcrypt password hashing, JWT authentication, user enumeration protection
- **Database**: PostgreSQL with unique indexes, Qdrant for vector search
- **Singleton Pattern**: Single instances of database clients reused across the app

## Current Implementation Status

### ✅ Completed

- [x] Environment variable validation
- [x] PostgreSQL connection and repository patterns
- [x] Authentication system (register/login/API Keys)
- [x] Password hashing with bcrypt
- [x] JWT token generation and validation
- [x] Centralized error handling (`AppError`)
- [x] Request validation with Zod
- [x] Multi-modal extraction (Text, Link, Document/PDF/OCR)
- [x] Vector embeddings with OpenRouter
- [x] Semantic search and management with Qdrant
- [x] Model Context Protocol (MCP) server
- [x] Comprehensive test suite (`test.sh`)
- [x] Docker containerization

### 🚧 Planned / Ongoing

- [x] Memory retrieval endpoints (In productive use)
- [ ] Knowledge graph visualization
- [ ] Advanced Rate limiting (Tiered users)
- [ ] Firecrawl integration for deeper web analysis
- [ ] IDE Integrations (VSCode/Cursor plugin)

## Contributing

Please follow the coding standards outlined in [BEST_PRACTICES.md](BEST_PRACTICES.md) when contributing to this project.

## License

See the root `LICENSE` file for details.

Paste in the claude desktop:

```
{
  "mcpServers": {
    "memories": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "here-https-server-url/api/v1/mcp?apiKey={apikey}"
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
