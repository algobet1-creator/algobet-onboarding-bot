-- schema.sql
-- AlgoBetAi Onboarding Bot — PostgreSQL Schema
-- Run this manually if you prefer to manage migrations outside the bot,
-- otherwise the bot runs initDb() on startup and applies this automatically.

-- ────────────────────────────────────────────────────────────────────────────
-- Users table
-- Stores every user who has initiated the onboarding flow.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,

  -- Telegram identifiers
  telegram_id       BIGINT UNIQUE NOT NULL,
  username          VARCHAR(255),          -- may be NULL (not all users have one)
  first_name        VARCHAR(255) NOT NULL,

  -- Onboarding state
  age_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
  legal_accepted    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lifecycle
  -- PENDING        → onboarding complete, awaiting admin decision
  -- APPROVED       → admin called approveChatJoinRequest
  -- REJECTED       → admin called declineChatJoinRequest
  -- DECLINED_AGE   → user answered "NO" to the age gate
  -- CANCELLED      → user cancelled at the statement step
  status            VARCHAR(50) NOT NULL DEFAULT 'PENDING',

  -- Current step in the onboarding wizard
  -- WELCOME | AGE_GATE | STATEMENT | LEGAL | DONE
  onboarding_step   VARCHAR(50) NOT NULL DEFAULT 'WELCOME',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at  ON users(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- Optional: auto-update updated_at via trigger
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
