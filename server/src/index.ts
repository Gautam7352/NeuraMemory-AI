import express from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRouter from './routes/auth.route.js';
import memoryRouter from './routes/memorie.route.js';
import mcpRouter from './routes/mcp.route.js';
import chatRouter from './routes/chat.route.js';
import healthRouter from './routes/health.route.js';
import swaggerSpec from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrf.js';
import { ensureDatabaseSchema } from './repositories/user.repository.js';
import { closePool } from './lib/postgres.js';
import { getQdrantClient, closeQdrantClient } from './lib/qdrant.js';
import { logger } from './utils/logger.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));
// ---------------------------------------------------------------------------
// CORS Configuration
// ---------------------------------------------------------------------------
const allowedOrigins = [
  ...env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  'https://neuramemory-server-31080282917.us-central1.run.app',
  'https://neuramemory-server-6zfpnl4vda-uc.a.run.app',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn(`[CORS] Rejected Origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'mcp-session-id', 'x-csrf-token'],
    exposedHeaders: ['x-csrf-token'],
  }),
);

app.use(csrfProtection);

// ---------------------------------------------------------------------------
// Documentation & Routes
// ---------------------------------------------------------------------------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs/spec.json', (_req, res) => res.json(swaggerSpec));

app.use('/api/v1', authRouter);
app.use('/api/v1/memories', memoryRouter);
app.use('/api/v1/mcp', mcpRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/health', healthRouter);
app.use('/health', healthRouter);

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Lifecycle Management
// ---------------------------------------------------------------------------
let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

function logStartupBanner(): void {
  logger.info('==================================================');
  logger.info('🚀 NeuraMemory-AI Server Starting');
  logger.info(`• Node Version: ${process.version}`);
  logger.info(`• Environment : ${env.NODE_ENV}`);
  logger.info(`• Port        : ${env.PORT}`);
  logger.info(`• PID         : ${process.pid}`);
  logger.info('==================================================');
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  setTimeout(() => {
    logger.error('[Shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10_000).unref();

  try {
    if (server) {
      await new Promise<void>((res) => server?.close(() => res()));
      logger.info('[Shutdown] HTTP server closed.');
    }
    await closePool();
    logger.info('[Shutdown] PostgreSQL pool closed.');
    closeQdrantClient();
    logger.info('[Shutdown] Qdrant client closed.');
    
    process.exit(0);
  } catch (err) {
    logger.error('[Shutdown] Error during shutdown:', err);
    process.exit(1);
  }
}

function registerProcessHandlers(): void {
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('[Process] Unhandled rejection:', reason));
  process.on('uncaughtException', (err) => {
    logger.error('[Process] Uncaught exception:', err);
    void shutdown('uncaughtException');
  });
}

async function main(): Promise<void> {
  logStartupBanner();

  const port = Number(env.PORT);
  server = app.listen(port, () => {
    logger.info(`[Startup] Server is listening on port ${port}. Starting dependency initialization...`);

    // Run dependency verification in the background to avoid blocking the Startup Probe
    (async () => {
      try {
        // Ensure DB Connectivity
        const { checkConnectivity } = await import('./lib/postgres.js');
        const isDbConnected = await checkConnectivity();
        if (!isDbConnected) {
          throw new Error('Could not connect to PostgreSQL. Ensure the local service is running on port 5432.');
        }

        await ensureDatabaseSchema();
        logger.info('[Startup] Database connectivity and schema verified.');

        const qdrant = getQdrantClient();
        await qdrant.getCollections();
        logger.info('[Startup] Qdrant connectivity verified.');
        logger.info('🚀 NeuraMemory-AI is fully operational.');
      } catch (err) {
        logger.error('[Startup] Initialization failed:', err);
        // We don't exit in production here, allowing the health check to report the failure 
        // and standard retries to happen while keeping the process alive for debug/logs.
      }
    })();
  });
}

registerProcessHandlers();

const isMain = import.meta.url === `file://${process.argv[1]}` || 
               process.argv[1]?.endsWith('index.ts') || 
               process.argv[1]?.endsWith('index.js');

if (isMain) {
  main().catch((err) => {
    console.error('[Startup] Fatal:', err);
    process.exit(1);
  });
}

export { app };
