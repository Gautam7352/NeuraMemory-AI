import { query } from '../lib/postgres.js';
import type { IUser, UserRow } from '../types/auth.types.js';

/**
 * Ensures the database schema (tables and indexes) exists.
 * Should be called once at application startup.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  // 1. Enable pgcrypto for gen_random_uuid()
  await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // 2. Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      api_key       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_api_key
    ON users (api_key) WHERE api_key IS NOT NULL
  `);

  // 3. Conversations table
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
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (user_id, updated_at DESC)
  `);
}

// ---------------------------------------------------------------------------
// Row → domain mapping
// ---------------------------------------------------------------------------

function rowToUser(row: UserRow): IUser & { id: string } {
  const user: IUser & { id: string } = {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
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
 */
export async function findUserByApiKey(
  apiKey: string,
): Promise<(IUser & { id: string }) | null> {
  const { rows } = await query<UserRow>(
    'SELECT * FROM users WHERE api_key = $1 LIMIT 1',
    [apiKey],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
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
 * Updates a user's API Key.
 */
export async function updateUserApiKey(
  id: string,
  apiKey: string,
): Promise<void> {
  await query(
    'UPDATE users SET api_key = $1, updated_at = now() WHERE id = $2',
    [apiKey, id],
  );
}
