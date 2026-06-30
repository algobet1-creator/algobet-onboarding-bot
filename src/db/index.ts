// src/db/index.ts

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error', err);
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
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

export async function initDb(): Promise<void> {
  logger.info('Initializing database schema...');
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      telegram_id       BIGINT UNIQUE NOT NULL,
      username          VARCHAR(255),
      first_name        VARCHAR(255) NOT NULL,
      age_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
      legal_accepted    BOOLEAN NOT NULL DEFAULT FALSE,
      status            VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      onboarding_step   VARCHAR(50) NOT NULL DEFAULT 'WELCOME',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  `);
  logger.info('Database schema ready.');
}
