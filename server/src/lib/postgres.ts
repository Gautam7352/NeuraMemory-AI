import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

/**
 * Singleton PostgreSQL connection pool.
 * Optimized for high concurrency (100+ users).
 */
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    // Optimized for local VM residency.
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 25,                          // Increased for dedicated local instance
      idleTimeoutMillis: 10000,         // Standard 10s timeout
      connectionTimeoutMillis: 5000,
      maxUses: 10000,                   // Extended lifespan for local connections
    });

    pool.on('connect', () => {
      logger.info('[PostgreSQL] New client connected to local pool');
    });

    pool.on('error', (err: Error) => {
      logger.error('[PostgreSQL] Unexpected pool error:', err);
    });
  }
  return pool;
}

/**
 * Convenience helper — runs a single parameterised query against the pool.
 */
export async function query<
  T extends pg.QueryResultRow = Record<string, unknown>,
>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Executes a callback within a managed transaction.
 * Automatically handles BEGIN/COMMIT/ROLLBACK and client release.
 */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verifies database connectivity.
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (err) {
    logger.error('[PostgreSQL] Connectivity check failed:', err);
    return false;
  }
}

/**
 * Gracefully shuts down the pool (call on process exit).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('[PostgreSQL] Pool drained and closed.');
  }
}
