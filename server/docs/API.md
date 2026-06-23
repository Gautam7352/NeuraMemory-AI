# API Documentation

The NeuraMemory-AI API is a RESTful interface for managing user memories and interacting with AI models.

## 📖 Live Documentation (Swagger)

The most up-to-date and interactive documentation (OpenAPI 3.0) is available directly through the server:

- **Endpoint**: `/api-docs` (e.g., `http://localhost:3000/api-docs`)
- **JSON Spec**: `/api-docs/spec.json`

Use the Swagger UI to test endpoints directly from your browser.

---

## 🔐 Authentication

Most endpoints require authentication. We support two methods:

### 1. JWT (Web Application)

Used by the React frontend.

- **Method**: `Authorization: Bearer <token>`
- **Obtain**: Call `/api/v1/login`.

### 2. API Key (MCP & Integrations)

Used by external tools like the Claude Desktop MCP.

- **Method**: `x-api-key: <key>` header or `?apiKey=<key>` query parameter (SSE only).
- **Obtain**: Generate in the UI or via `/api/v1/api-key`.

---

## 🚦 Rate Limiting

To ensure stability, we apply rate limits based on the user's ID or IP.

- **Auth Endpoints**: Strict limits to prevent brute-force attacks.
- **Memory Endpoints**: Moderate limits to prevent excessive LLM/Embedding usage.
- **Chat Endpoints**: Configurable window (e.g., 30 requests/minute in production).

When a limit is reached, the API returns a `429 Too Many Requests` status code.

---

## ❌ Error Handling

All errors return a consistent JSON body:

```json
{
  "success": false,
  "message": "Human readable error description"
}
```

### Common Status Codes

| Code  | Name                 | Description                             |
| :---- | :------------------- | :-------------------------------------- |
| `400` | Bad Request          | Validation failed (Zod error)           |
| `401` | Unauthorized         | Missing or invalid authentication       |
| `403` | Forbidden            | Insufficient permissions                |
| `409` | Conflict             | Resource already exists (e.g., email)   |
| `422` | Unprocessable Entity | Logic error (e.g., failed to fetch URL) |
| `429` | Too Many Requests    | Rate limit exceeded                     |
| `500` | Internal Error       | Unexpected server-side failure          |

---

## 🛠 Standard Headers

- `Content-Type: application/json`
- `Accept: application/json`
- `x-csrf-token`: Required for state-changing requests (POST/PATCH/DELETE) in the web app to prevent cross-site request forgery.
