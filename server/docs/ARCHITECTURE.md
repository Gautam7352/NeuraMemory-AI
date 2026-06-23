# Architecture Design

NeuraMemory-AI follows a clean, layered architecture designed for scalability, maintainability, and clear separation of concerns.

## 🏗 Layered Architecture

The backend is structured into four primary layers:

1.  **Routes Layer** (`/src/routes`):
    - Defines HTTP endpoints.
    - Applies middleware (auth, rate limiting, file uploads).
    - Delegates requests to Controllers.

2.  **Controller Layer** (`/src/controllers`):
    - Handles HTTP-specific logic (parsing params, sending responses).
    - Validates request bodies using Zod schemas.
    - Calls one or more Services to fulfill the request.

3.  **Service Layer** (`/src/services`):
    - Contains the core business logic.
    - Orchestrates complex flows (e.g., fetching a link, extracting text, calling LLM, generating embeddings).
    - Agnotic of the HTTP layer.

4.  **Repository Layer** (`/src/repositories`):
    - Handles all data persistence and retrieval.
    - Interacts directly with PostgreSQL (metadata) and Qdrant (vector embeddings).
    - Provides a clean API for the Services to store and find data.

---

## 🔄 Data Flow: Memory Ingestion

When a user submits a piece of information (text, link, or document), the following flow occurs:

1.  **Extraction**: Content is extracted from the source (URL fetching, PDF parsing, or plain text).
2.  **Chunking**: Large texts are split into manageable chunks for the LLM.
3.  **Memory Synthesis**: The LLM (via OpenRouter) identifies "Semantic Facts" (facts that don't change often) and "Episodic Bubbles" (event-based memories).
4.  **Embedding**: Each extracted memory is converted into a vector representation using an embedding model.
5.  **Storage**:
    - **PostgreSQL**: Stores user metadata and API keys.
    - **Qdrant**: Stores the vector embeddings and memory text for semantic search.

---

## 🔍 Data Flow: Memory Retrieval (RAG)

When a user chats with their "Memory Hub":

1.  **Query Embedding**: Decides if the query needs memory context and generates an embedding for the query.
2.  **Vector Search**: Qdrant performs a similarity search to find the most relevant stored memories.
3.  **Context Injection**: The top relevant memories are injected into the LLM prompt as context.
4.  **Response Generation**: The LLM generates a grounded response based on the user's personal memory.

---

## 🛠 Key Infrastructure

- **PostgreSQL**: Reliable relational storage for structured data (Users, Accounts, Sessions).
- **Qdrant**: High-performance vector database for semantic search and high-dimensional data retrieval.
- **OpenRouter**: Unified gateway for accessing state-of-the-art LLMs (Claude, GPT, Gemini) for extraction and conversation.
- **Firecrawl**: (Optional/Planned) For robust web scraping and link extraction.
