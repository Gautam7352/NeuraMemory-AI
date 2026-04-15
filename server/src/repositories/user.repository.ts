import { query } from '../lib/postgres.js';
import type { IUser, UserRow } from '../types/auth.types.js';

/**
 * Lightweight cache for API Key lookups.
 * Since API keys are the primary auth mechanism for ingestion/MCP, 
 * caching them reduces DB load significantly.
 */
const apiKeyCache = new Map<string, { user: IUser & { id: string }; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Ensures the database schema (tables and indexes) exists.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      api_key       TEXT,
      token_version INTEGER     NOT NULL DEFAULT 1,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT        NOT NULL,
      messages   JSONB       NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  
  await query(`
    CREATE TABLE IF NOT EXISTS memories (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text       TEXT        NOT NULL,
      kind       TEXT        NOT NULL,
      importance FLOAT       NOT NULL DEFAULT 0.5,
      source     TEXT        NOT NULL,
      source_ref TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_date ON conversations(user_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_memories_user_kind ON memories(user_id, kind)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id)`);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_api_key
    ON users (api_key) WHERE api_key IS NOT NULL
  `);
}

/**
 * Returns simple storage statistics for maintenance monitoring.
 */
export async function getStorageStats(): Promise<Record<string, string>> {
  const result = await query<{ table_name: string; total_size: string }>(`
    SELECT 
      relname as table_name, 
      pg_size_pretty(pg_total_relation_size(relid)) as total_size
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC;
  `);

  const stats: Record<string, string> = {};
  result.rows.forEach(row => {
    stats[row.table_name] = row.total_size;
  });
  return stats;
}

// ---------------------------------------------------------------------------
// Row → domain mapping
// ---------------------------------------------------------------------------

function rowToUser(row: UserRow): IUser & { id: string } {
  const user: IUser & { id: string } = {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    tokenVersion: row.token_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.api_key !== null) {
    user.apiKey = row.api_key;
  }
  return user;
}

/**
 * Finds a single user by email address.
 */
export async function findUserByEmail(
  email: string,
): Promise<(IUser & { id: string }) | null> {
  const { rows } = await query<UserRow>(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

/**
 * Finds a single user by API Key.
 * Uses an in-memory cache to skip DB round-trips for high-frequency calls.
 */
export async function findUserByApiKey(
  apiKey: string,
): Promise<(IUser & { id: string }) | null> {
  // 1. Check Cache
  const cached = apiKeyCache.get(apiKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.user;
  }

  // 2. Query DB
  const { rows } = await query<UserRow>(
    'SELECT * FROM users WHERE api_key = $1 LIMIT 1',
    [apiKey],
  );

  if (!rows[0]) {
    // If it was cached but now missing from DB, clear it
    if (cached) apiKeyCache.delete(apiKey);
    return null;
  }
  
  const user = rowToUser(rows[0]);

  // 3. Store in Cache (simple limit to prevent memory leak)
  if (apiKeyCache.size > 1000) apiKeyCache.clear();
  apiKeyCache.set(apiKey, { user, timestamp: now });

  return user;
}

/**
 * Locks the user record for the duration of a transaction (FOR UPDATE).
 * Use this to serialize complex operations like memory ingestion.
 */
export async function lockUser(
  client: { query: (t: string, p: any[]) => Promise<any> },
  id: string,
): Promise<void> {
  await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [id]);
}

/**
 * Finds a single user by its UUID.
 */
export async function findUserById(
  id: string,
): Promise<(IUser & { id: string }) | null> {
  const { rows } = await query<UserRow>(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

/**
 * Inserts a new user and returns the full record.
 */
export async function createUser(
  email: string,
  passwordHash: string,
): Promise<IUser & { id: string }> {
  const { rows } = await query<UserRow>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING *`,
    [email, passwordHash],
  );
  return rowToUser(rows[0]!);
}

/**
 * Updates a user's API Key and invalidates the cache.
 */
export async function updateUserApiKey(
  id: string,
  apiKey: string,
): Promise<void> {
  // Invalidate any existing entries for this user in the cache
  // Since we don't know the old key easily, we clear the cache 
  // or iterate. For simplicity/low-frequency of key rotation, clear is fine.
  apiKeyCache.clear();

  await query(
    'UPDATE users SET api_key = $1, updated_at = now() WHERE id = $2',
    [apiKey, id],
  );
}
