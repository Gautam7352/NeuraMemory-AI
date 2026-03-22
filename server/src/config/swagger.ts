import type { JsonObject } from 'swagger-ui-express';

const swaggerSpec: JsonObject = {
  openapi: '3.0.3',

  info: {
    title: 'NeuraMemory-AI API',
    version: '1.0.0',
    description:
      'API for NeuraMemory-AI — a long-term contextual memory system that extracts semantic and episodic memories from text, documents, and links, embeds them as vectors, and stores them in Qdrant for intelligent retrieval.',
    contact: {
      name: 'NeuraMemory-AI',
      url: 'https://github.com/Gautam7352/NeuraMemory-AI',
    },
    license: {
      name: 'AGPL-3.0',
      url: 'https://www.gnu.org/licenses/agpl-3.0.html',
    },
  },

  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],

  tags: [
    {
      name: 'Auth',
      description: 'User registration and authentication',
    },
    {
      name: 'Memories',
      description:
        'Create, retrieve, search, edit, and delete memories. All endpoints require JWT authentication.',
    },
    {
      name: 'Chat',
      description: 'AI chat with memory context via Server-Sent Events.',
    },
    {
      name: 'MCP',
      description: 'Model Context Protocol endpoints for AI integrations.',
    },
  ],

  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT token obtained from `/api/v1/login`. Pass as `Authorization: Bearer <token>`.',
      },
    },

    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed.' },
        },
        required: ['success', 'message'],
      },

      AuthCredentials: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'SecurePass123',
          },
        },
        required: ['email', 'password'],
      },

      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful.' },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
              email: { type: 'string', example: 'user@example.com' },
            },
          },
        },
        required: ['success', 'message'],
      },

      ApiKeyResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'API key generated successfully.' },
          apiKey: { type: 'string', example: 'sk_8f7d9a0c1b2e3d4f5g...' },
        },
        required: ['success', 'message', 'apiKey'],
      },

      Bubble: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            example: 'User is debugging JWT validation issue',
          },
          importance: { type: 'number', minimum: 0, maximum: 1, example: 0.8 },
        },
        required: ['text', 'importance'],
      },

      MemoryCreateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: {
            type: 'string',
            example: 'Successfully stored 3 memories.',
          },
          data: {
            type: 'object',
            properties: {
              memoriesStored: { type: 'integer', example: 3 },
              semantic: {
                type: 'array',
                items: { type: 'string' },
                example: ["User's name is Shivam", 'User prefers dark mode'],
              },
              bubbles: {
                type: 'array',
                items: { $ref: '#/components/schemas/Bubble' },
              },
            },
          },
        },
        required: ['success', 'message'],
      },

      StoredMemory: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          text: { type: 'string', example: "User's name is Shivam" },
          kind: { type: 'string', enum: ['semantic', 'bubble'] },
          importance: { type: 'number', example: 1.0 },
          source: { type: 'string', enum: ['text', 'document', 'link'] },
          sourceRef: {
            type: 'string',
            nullable: true,
            example: 'https://example.com/article',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-18T05:30:00.000Z',
          },
        },
      },

      MemoryListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Found 5 memories.' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/StoredMemory' },
          },
        },
        required: ['success', 'message', 'data'],
      },

      MemoryDeleteResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'All memories deleted.' },
        },
        required: ['success', 'message'],
      },

      MemoryItem: {
        allOf: [{ $ref: '#/components/schemas/StoredMemory' }],
        properties: {
          id: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        },
        required: ['id'],
        description: 'A stored memory with its Qdrant point ID.',
      },

      ChatRequest: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            minLength: 1,
            maxLength: 10000,
            example: 'What do I know about React hooks?',
          },
        },
        required: ['message'],
      },

      ChatSseEvent: {
        type: 'object',
        description: 'A single SSE event sent by the chat endpoint.',
        properties: {
          type: {
            type: 'string',
            enum: ['token', 'done', 'error'],
            example: 'token',
          },
          content: {
            type: 'string',
            description: 'Present when type is "token".',
            example: 'React hooks are',
          },
          message: {
            type: 'string',
            description: 'Present when type is "error".',
            example: 'LLM service unavailable.',
          },
        },
        required: ['type'],
      },

      StatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 42 },
              byKind: {
                type: 'object',
                properties: {
                  semantic: { type: 'integer', example: 30 },
                  bubble: { type: 'integer', example: 12 },
                },
              },
              bySource: {
                type: 'object',
                properties: {
                  text: { type: 'integer', example: 20 },
                  link: { type: 'integer', example: 15 },
                  document: { type: 'integer', example: 7 },
                },
              },
            },
          },
        },
        required: ['success', 'data'],
      },

      ProfileResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email', example: 'user@example.com' },
              createdAt: { type: 'string', format: 'date-time', example: '2026-01-01T00:00:00.000Z' },
            },
            required: ['email', 'createdAt'],
          },
        },
        required: ['success', 'data'],
      },

      MemoryUpdateRequest: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 100000,
            example: 'Updated memory content.',
          },
        },
        required: ['text'],
      },

      SearchResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Found 3 memories.' },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/MemoryItem' },
          },
        },
        required: ['success', 'message', 'data'],
      },
    },
  },

  paths: {
    '/api/v1/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description:
          'Creates a new account and returns a JWT token. Password must be ≥ 8 chars with at least one uppercase letter and one number.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Account created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': {
            description:
              'Validation error (invalid email, weak password, etc.)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },

    '/api/v1/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        description:
          'Authenticates with email and password. Returns a JWT token valid for the configured expiry period.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid email or password',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },

    '/api/v1/api-key': {
      post: {
        tags: ['Auth'],
        summary: 'Generate an API key',
        description:
          'Generates a newly minted API key for the authenticated user to connect their LLM via the MCP server.',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': {
            description: 'API key generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiKeyResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/memories/text': {
      post: {
        tags: ['Memories'],
        summary: 'Create memories from plain text',
        description:
          'Sends text to the LLM for memory extraction (semantic facts and episodic bubbles). Extracted memories are embedded and stored in the vector database.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100000,
                    example:
                      'My name is Shivam. I love building AI systems and I prefer dark mode.',
                  },
                },
                required: ['text'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Memories extracted and stored',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemoryCreateResponse',
                },
              },
            },
          },
          '400': {
            description: 'Validation error (empty text, etc.)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '502': {
            description: 'LLM or embedding API failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/memories/link': {
      post: {
        tags: ['Memories'],
        summary: 'Create memories from a URL',
        description:
          'Fetches content from the URL, strips HTML, extracts memories via LLM, embeds, and stores.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://example.com/article',
                  },
                },
                required: ['url'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Memories extracted and stored',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemoryCreateResponse',
                },
              },
            },
          },
          '400': {
            description: 'Validation error (invalid URL, non-HTTP scheme)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Could not fetch or parse URL content',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '502': {
            description: 'LLM or embedding API failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/memories/document': {
      post: {
        tags: ['Memories'],
        summary: 'Create memories from an uploaded document',
        description:
          'Upload a document (PDF, DOCX, TXT, or MD). The server extracts text (including OCR for scanned PDFs), passes it through the LLM for memory extraction, embeds, and stores. Max file size: 10 MB.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description:
                      'Document file (PDF, DOCX, TXT, MD). Max 10 MB.',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Memories extracted and stored',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemoryCreateResponse',
                },
              },
            },
          },
          '400': {
            description: 'No file attached or unsupported content',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '413': {
            description: 'File exceeds 10 MB size limit',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '415': {
            description:
              'Unsupported file type (must be PDF, DOCX, TXT, or MD)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description:
              'Could not extract text from document (e.g. scanned PDF)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '502': {
            description: 'LLM or embedding API failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/v1/memories': {
      get: {
        tags: ['Memories'],
        summary: 'List memories',
        description:
          'Retrieves stored memories for the authenticated user with cursor-based pagination. Supports filtering by memory kind and source.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'kind',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['semantic', 'bubble'] },
            description: 'Filter by memory kind.',
          },
          {
            name: 'source',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['text', 'document', 'link'] },
            description: 'Filter by ingestion source.',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 20 },
            description: 'Max number of results per page.',
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Cursor returned by the previous page as `nextOffset`.',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of memories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Found 20 memories.' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/MemoryItem' } },
                    nextOffset: { type: 'string', nullable: true, example: 'abc123' },
                    hasMore: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },

      delete: {
        tags: ['Memories'],
        summary: 'Delete all memories',
        description: 'Permanently deletes all stored memories for the authenticated user.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All memories deleted',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MemoryDeleteResponse' } } },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/memories/search': {
      get: {
        tags: ['Memories'],
        summary: 'Semantic search over memories',
        description: 'Embeds the query and performs a vector similarity search over the authenticated user\'s memories.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1 },
            description: 'Search query string.',
            example: 'React hooks',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            description: 'Max results (clamped to [1, 50]).',
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SearchResponse' } } },
          },
          '400': {
            description: 'Missing or empty query',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/memories/stats': {
      get: {
        tags: ['Memories'],
        summary: 'Memory statistics',
        description: 'Returns total memory count broken down by kind (semantic/bubble) and source (text/link/document).',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Memory stats',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StatsResponse' } } },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/memories/{id}': {
      patch: {
        tags: ['Memories'],
        summary: 'Update a memory',
        description: 'Re-embeds and updates the text of a single memory. Only the owner may update.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Qdrant point ID of the memory.',
          },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MemoryUpdateRequest' } } },
        },
        responses: {
          '200': {
            description: 'Memory updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Memory updated.' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error (empty or too-long text)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '403': {
            description: 'Memory belongs to a different user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'Memory not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },

      delete: {
        tags: ['Memories'],
        summary: 'Delete a single memory',
        description: 'Permanently deletes one memory by ID. Only the owner may delete.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Qdrant point ID of the memory.',
          },
        ],
        responses: {
          '200': {
            description: 'Memory deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Memory deleted.' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '403': {
            description: 'Memory belongs to a different user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'Memory not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        description: 'Returns the authenticated user\'s email and account creation date.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileResponse' } } },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '404': {
            description: 'User not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out',
        description: 'Clears the session / invalidates the token (implementation-dependent).',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out.' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user identity',
        description: 'Returns the minimal identity (id, email) of the currently authenticated user.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'User identity',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
                        email: { type: 'string', example: 'user@example.com' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/chat': {
      post: {
        tags: ['Chat'],
        summary: 'AI chat with memory context (SSE)',
        description:
          'Sends a message to the AI assistant. The server retrieves relevant memories via semantic search, builds a context-aware prompt, and streams the LLM response as Server-Sent Events.\n\n' +
          'Each SSE line is `data: <JSON>` where JSON is a `ChatSseEvent` object. The stream ends with a `done` event.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatRequest' } } },
        },
        responses: {
          '200': {
            description: 'SSE stream of chat tokens',
            content: {
              'text/event-stream': {
                schema: { $ref: '#/components/schemas/ChatSseEvent' },
              },
            },
          },
          '400': {
            description: 'Validation error (empty or too-long message)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '401': {
            description: 'Missing or invalid JWT',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '502': {
            description: 'LLM or embedding API failure (sent as SSE error event mid-stream)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    '/api/v1/mcp/health': {
      get: {
        tags: ['MCP'],
        summary: 'MCP health check',
        description: 'Unauthenticated liveness probe for the MCP server.',
        responses: {
          '200': {
            description: 'MCP server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'NeuraMemory-MCP' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/mcp': {
      post: {
        tags: ['MCP'],
        summary: 'Initialize or send MCP message',
        description:
          'Handles MCP Streamable HTTP transport. On the first request (no `mcp-session-id` header) a new session is created and the session ID is returned in the response header. Subsequent requests must include the `mcp-session-id` header to route to the existing session.\n\n' +
          'Authentication is via API key supplied as `apiKey` query param, `x-api-key` header, or `Authorization: Bearer <key>` header.',
        parameters: [
          {
            name: 'mcp-session-id',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Session ID returned from the initial POST. Omit on first request.',
          },
          {
            name: 'apiKey',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'User API key. Can also be sent via `x-api-key` or `Authorization: Bearer` headers.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'JSON-RPC 2.0 MCP request payload.',
                properties: {
                  jsonrpc: { type: 'string', example: '2.0' },
                  id: { type: 'string', example: '1' },
                  method: { type: 'string', example: 'tools/call' },
                  params: { type: 'object' },
                },
                required: ['jsonrpc', 'method'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'MCP response (JSON-RPC result or SSE stream depending on method)',
          },
          '401': {
            description: 'Missing or invalid API key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },

      get: {
        tags: ['MCP'],
        summary: 'Poll MCP session (SSE)',
        description:
          'Opens a Server-Sent Events stream for an existing MCP session. Requires a valid `mcp-session-id` header.',
        parameters: [
          {
            name: 'mcp-session-id',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Session ID obtained from the initial POST.',
          },
        ],
        responses: {
          '200': {
            description: 'SSE stream for the MCP session',
            content: {
              'text/event-stream': {
                schema: { type: 'string' },
              },
            },
          },
          '400': {
            description: 'Invalid or missing session ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },

      delete: {
        tags: ['MCP'],
        summary: 'Terminate MCP session',
        description: 'Closes and removes an existing MCP session. Requires a valid `mcp-session-id` header.',
        parameters: [
          {
            name: 'mcp-session-id',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Session ID to terminate.',
          },
        ],
        responses: {
          '200': {
            description: 'Session terminated successfully',
          },
          '400': {
            description: 'Invalid or missing session ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};

export default swaggerSpec;
