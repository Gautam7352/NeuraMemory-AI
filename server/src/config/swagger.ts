/**
 * OpenAPI 3.0 specification for NeuraMemory-AI.
 *
 * Served at `/api-docs` via swagger-ui-express.
 */

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
        'Create, retrieve, and delete memories. All endpoints require JWT authentication.',
    },
    {
      name: 'MCP',
      description: 'Model Context Protocol endpoints for AI integrations.',
    },
  ],

  // ---------------------------------------------------------------------------
  // Security schemes
  // ---------------------------------------------------------------------------
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
      // ── Shared ──────────────────────────────────────────────────────────
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed.' },
        },
        required: ['success', 'message'],
      },

      // ── Auth ────────────────────────────────────────────────────────────
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
          message: {
            type: 'string',
            example: 'API key generated successfully.',
          },
          apiKey: { type: 'string', example: 'sk_8f7d9a0c1b2e3d4f5g...' },
        },
        required: ['success', 'message', 'apiKey'],
      },

      // ── Memories ────────────────────────────────────────────────────────
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
    },
  },

  // ---------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────
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

    // ── Memories — Create ─────────────────────────────────────────────────
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

    // ── Memories — Read / Delete ──────────────────────────────────────────
    '/api/v1/memories': {
      get: {
        tags: ['Memories'],
        summary: 'List memories',
        description:
          'Retrieves all stored memories for the authenticated user. Supports filtering by memory kind and source.',
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
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 500,
              default: 100,
            },
            description: 'Max number of results to return.',
          },
        ],
        responses: {
          '200': {
            description: 'List of memories',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemoryListResponse',
                },
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

      delete: {
        tags: ['Memories'],
        summary: 'Delete all memories',
        description:
          'Permanently deletes all stored memories for the authenticated user.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'All memories deleted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MemoryDeleteResponse',
                },
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

    // ── MCP ───────────────────────────────────────────────────────────────
    '/api/v1/mcp/health': {
      get: {
        tags: ['MCP'],
        summary: 'MCP Health Check',
        description:
          'Simple unauthenticated endpoint to verify the MCP server is alive.',
        responses: {
          '200': {
            description: 'MCP server is healthy',
          },
        },
      },
    },

    '/api/v1/mcp/sse': {
      get: {
        tags: ['MCP'],
        summary: 'Establish MCP SSE Connection',
        description:
          'Endpoint to establish a Server-Sent Events stream for Model Context Protocol. A valid user API Key is strictly required.',
        parameters: [
          {
            name: 'apiKey',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'User API Key. Can also be provided via the `Authorization: Bearer <key>` or `x-api-key` HTTP headers.',
          },
        ],
        responses: {
          '200': {
            description: 'SSE stream connection established',
          },
          '401': {
            description: 'Missing or invalid API key',
          },
        },
      },
    },
  },
};

export default swaggerSpec;
