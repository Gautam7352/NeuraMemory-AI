# NeuraMemory-AI Server

This is the backend server for NeuraMemory-AI, built with TypeScript and modern development tooling.

## Tech Stack
- **Runtime**: Node.js (ESM)
- **Language**: [TypeScript](https://www.typescript.org/) (Target: ESNext)
- **Development Runner**: [tsx](https://tsx.is/)
- **Linting**: [ESLint](https://eslint.org/) (Flat Config)
- **Formatting**: [Prettier](https://prettier.io/)

## Documentation

For detailed information about the project's architecture and coding standards, please refer to the documentation in the `docs/` directory:

- [Architecture Design](docs/ARCHITECTURE.md)
- [Best Practices](docs/BEST_PRACTICES.md)

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

### Production
Build the project:
```bash
npm run build
```
Start the compiled server:
```bash
npm run start
```
