import express from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRouter from './routes/auth.route.js';
import memoryRouter from './routes/memorie.route.js';
import swaggerSpec from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureDatabaseSchema } from './repositories/user.repository.js';
import { closePool } from './lib/postgres.js';
import mcpRouter from './routes/mcp.route.js';
import healthRouter from './routes/health.route.js';
import chatRouter from './routes/chat.route.js';
import { getQdrantClient, closeQdrantClient } from './lib/qdrant.js';
import { logger } from './utils/logger.js';

const app = express();
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));

// cors
const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / curl requests (no origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      logger.warn(`[CORS] Rejected Origin: ${origin}`);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------------------------------------------------------------------------
// API Documentation (Swagger UI)
// ---------------------------------------------------------------------------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs/spec.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1', authRouter);
app.use('/api/v1/memories', memoryRouter);
app.use('/api/v1/mcp', mcpRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/health', healthRouter);

// ---------------------------------------------------------------------------
// Error handler — must be registered after all routes
// ---------------------------------------------------------------------------
app.use(errorHandler);

let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

function logStartupBanner(): void {
  logger.info('==================================================');
  logger.info('🚀 NeuraMemory-AI Server Starting');
  logger.info(`• Node Version: ${process.version}`);
  logger.info(`• Environment : ${env.NODE_ENV}`);
  logger.info(`• Port        : ${env.PORT}`);
  logger.info(`• PID         : ${process.pid}`);
  logger.info(`• Started At  : ${new Date().toISOString()}`);
  logger.info('==================================================');
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(
      `[Shutdown] Already in progress. Received additional signal: ${signal}`,
    );
    return;
  }

  isShuttingDown = true;
  logger.info(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  const hardTimeout = setTimeout(() => {
    logger.error('[Shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10_000);
  hardTimeout.unref();

  try {
    // Stop accepting new HTTP connections first
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err?: Error) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
      logger.info('[Shutdown] HTTP server closed.');
    }

    // Close PostgreSQL pool if initialized
    try {
      await closePool();
      logger.info('[Shutdown] PostgreSQL pool closed.');
    } catch {
      logger.info(
        '[Shutdown] PostgreSQL pool was not initialized or already closed.',
      );
    }

    // Close Qdrant client
    try {
      closeQdrantClient();
      logger.info('[Shutdown] Qdrant client closed.');
    } catch {
      logger.info(
        '[Shutdown] Qdrant client was not initialized or already closed.',
      );
    }

    logger.info('[Shutdown] Completed successfully.');
    process.exit(0);
  } catch (err) {
    logger.error('[Shutdown] Error during graceful shutdown:', { error: err });
    process.exit(1);
  }
}

function registerProcessHandlers(): void {
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('[Process] Unhandled promise rejection:', { error: reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('[Process] Uncaught exception:', { error: err });
    void shutdown('uncaughtException');
  });
}

async function main(): Promise<void> {
  logStartupBanner();

  // Ensure database schema is ready before serving traffic
  await ensureDatabaseSchema();
  logger.info('[Startup] Database schema verified.');

  // Verify Qdrant connectivity
  try {
    const qdrant = getQdrantClient();
    await qdrant.getCollections();
    logger.info('[Startup] Qdrant connectivity verified.');
  } catch (err) {
    logger.error(
      '[Startup] WARNING: Qdrant is unreachable. Memory operations will fail.',
      { error: err },
    );
  }

  const port = Number(env.PORT);

  server = app.listen(port, () => {
    logger.info(`[Startup] Server is listening on port ${port}`);
  });
}

registerProcessHandlers();

main().catch((err) => {
  logger.error('[Startup] Fatal error during initialization:', { error: err });
  process.exit(1);
});
