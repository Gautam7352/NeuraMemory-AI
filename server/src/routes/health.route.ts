import { Router, Request, Response } from 'express';
import { getMongoClient } from '../lib/mongodb.js';
import { getQdrantClient } from '../lib/qdrant.js';

const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const start = Date.now();

  const [mongoStatus, qdrantStatus] = await Promise.all([
    checkMongo(),
    checkQdrant(),
  ]);

  const allHealthy = mongoStatus.ok && qdrantStatus.ok;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    responseTimeMs: Date.now() - start,
    checks: {
      server: { ok: true },
      mongo: mongoStatus,
      qdrant: qdrantStatus,
    },
  });
});

async function checkMongo(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getMongoClient();
    await client.db().command({ ping: 1 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkQdrant(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getQdrantClient().getCollections();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export default healthRouter;
