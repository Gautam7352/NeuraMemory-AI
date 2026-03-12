import express from 'express';
import { env } from './config/env.js';
import authRouter from './routes/auth.route.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureUserIndexes } from './repositories/user.repository.js';

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1', authRouter);

// ---------------------------------------------------------------------------
// Error handler — must be registered after all routes
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function main() {
  console.log('--- NeuraMemory-AI Server Starting ---');
  console.log('Node Version:', process.version);
  console.log('Environment:', env.NODE_ENV);

  // Ensure MongoDB indexes are in place before accepting traffic
  await ensureUserIndexes();
  console.log('--- Database indexes verified ---');

  const port = Number(env.PORT);
  app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
