# Best Practices & Coding Standards

This document outlines the conventions and patterns used in the NeuraMemory-AI server to ensure code quality and consistency.

## 🛠 Technology & Language

- **TypeScript Everywhere**: Use strict typing. Avoid `any` at all costs.
- **ES Modules (ESM)**: We use `"type": "module"` in `package.json`. All imports must include the `.js` extension (e.g., `import { user } from './user.js'`).
- **Node.js 24+**: Leverage modern Node.js features like built-in `test` runner (if applicable) and top-level await.

---

## 🚦 Error Handling

Use the centralized `AppError` class located in `src/utils/AppError.ts`.

- **Pattern**: Do not use `try/catch` in controllers for simple error wrapping. Throw an `AppError` or let the `errorHandler` middleware catch async errors.
- **Status Codes**: Use appropriate HTTP status codes (400 for validation, 404 for missing resources, etc.).

```typescript
// Example
if (!user) {
  throw new AppError('User not found', 404);
}
```

---

## 📝 Request Validation

Every endpoint that accepts input (body, query, params) **must** validate it using [Zod](https://zod.dev/).

- Define schemas in `src/validations/`.
- Use the `parse` method to ensure type safety and early failure.

---

## 📂 Layer Responsibility

1.  **Routes**: Only define routes and middleware. No business logic.
2.  **Controllers**: Focus on Extract/Transform/Load (ETL) of the HTTP request. Handle `res.json()` or `res.send()`.
3.  **Services**: The "Brain". This is where the work happens. Services should be reusable across different controllers or even CLI tools.
4.  **Repositories**: The "Hands". Only interact with the database drivers. Don't put business logic here.

---

## 🔒 Security

- **JWT for Web**: Use cookies with `httpOnly: true` and `secure: true` in production.
- **CSRF Protection**: All mutation requests (POST/PATCH/DELETE) require a CSRF token.
- **Sanitization**: Never trust user input. Use parameterized queries (handled by our repository layer) and sanitize HTML content when extracting from links.

---

## 🧪 Testing

- **Unit Tests**: Use `vitest` for testing utilities and services.
- **API Tests**: Use the `test.sh` script to run end-to-end integration tests using `curl` and `jq`.
- **Coverage**: Aim for high coverage in critical paths (auth, memory extraction).
