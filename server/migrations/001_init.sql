-- NeuraMemory-AI: Initial PostgreSQL schema
-- Creates the users table with UUID primary keys

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  password_hash TEXT     NOT NULL,
  api_key    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast API-key lookups
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users (api_key) WHERE api_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  messages   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieving user conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (user_id, updated_at DESC);
