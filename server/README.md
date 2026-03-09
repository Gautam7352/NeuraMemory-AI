# NeuraMemory-AI Server

This is the backend server for NeuraMemory-AI, built with TypeScript and modern development tooling.

## Tech Stack
- **Runtime**: Node.js (ESM)
- **Language**: [TypeScript](https://www.typescript.org/) (Target: ES2025)
- **Development Runner**: [tsx](https://tsx.is/)
- **Linting**: [ESLint](https://eslint.org/) (Flat Config)
- **Formatting**: [Prettier](https://prettier.io/)

## Project Structure
```text
server/
├── dist/               # Compiled JavaScript
├── src/
│   └── index.ts        # Entry point
├── eslint.config.js    # ESLint configuration
├── tsconfig.json       # TypeScript configuration
└── .prettierrc         # Prettier configuration
```

## Getting Started

### Installation
```bash
npm install
```

### Development
To start the server with auto-reload (using `tsx watch`):
```bash
npm run dev
```
**How it works**: `tsx watch` monitors your `src/` directory. When a file is saved, it automatically restarts the process without needing a manual rebuild. This provides an instant feedback loop during development.

### Production
Build the project:
```bash
npm run build
```
Start the compiled server:
```bash
npm run start
```

### Tooling
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
