import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import authRouter from './routes/auth.route.js';
import memoryRouter from './routes/memorie.route.js';
import swaggerSpec from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureUserIndexes } from './repositories/user.repository.js';
import { getMongoClient } from './lib/mongodb.js';

const app = express();
app.use(express.json());

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

// ---------------------------------------------------------------------------
// Error handler — must be registered after all routes
// ---------------------------------------------------------------------------
app.use(errorHandler);

let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

function logStartupBanner(): void {
  console.log('==================================================');
  console.log('🚀 NeuraMemory-AI Server Starting');
  console.log(`• Node Version: ${process.version}`);
  console.log(`• Environment : ${env.NODE_ENV}`);
  console.log(`• Port        : ${env.PORT}`);
  console.log(`• PID         : ${process.pid}`);
  console.log(`• Started At  : ${new Date().toISOString()}`);
  console.log('==================================================');
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.warn(
      `[Shutdown] Already in progress. Received additional signal: ${signal}`,
    );
    return;
  }

  isShuttingDown = true;
  console.log(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  const hardTimeout = setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout.');
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
      console.log('[Shutdown] HTTP server closed.');
    }

    // Close MongoDB client if initialized
    try {
      const client = await getMongoClient();
      await client.close();
      console.log('[Shutdown] MongoDB client closed.');
    } catch {
      // getMongoClient() may fail if never initialized / env issues; ignore on shutdown
      console.log(
        '[Shutdown] MongoDB client was not initialized or already closed.',
      );
    }

    console.log('[Shutdown] Completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Shutdown] Error during graceful shutdown:', err);
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
    console.error('[Process] Unhandled promise rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught exception:', err);
    void shutdown('uncaughtException');
  });
}

async function main(): Promise<void> {
  logStartupBanner();

  // Ensure DB indexes are ready before serving traffic
  await ensureUserIndexes();
  console.log('[Startup] Database indexes verified.');

  const port = Number(env.PORT);

  server = app.listen(port, () => {
    console.log(`[Startup] Server is listening on port ${port}`);
  });
}

registerProcessHandlers();

main().catch((err) => {
  console.error('[Startup] Fatal error during initialization:', err);
  process.exit(1);
});
