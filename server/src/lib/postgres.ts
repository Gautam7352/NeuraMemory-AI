import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

/**
 * Singleton PostgreSQL connection pool.
 * Uses the DATABASE_URL from environment configuration.
 */
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    pool.on('connect', () => {
      console.log('--- PostgreSQL Connected ---');
    });

    pool.on('error', (err: Error) => {
      console.error('[PostgreSQL] Unexpected pool error:', err);
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
 * Gracefully shuts down the pool (call on process exit).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[PostgreSQL] Pool closed.');
  }
}
