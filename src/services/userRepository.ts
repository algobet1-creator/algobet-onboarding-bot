// src/services/userRepository.ts

import { query } from '../db';
import { OnboardingStatus, OnboardingStep, UserRecord } from '../types';

export async function upsertUser(
  telegramId: number,
  username: string | null,
  firstName: string,
): Promise<UserRecord> {
  const rows = await query<UserRecord>(
    `INSERT INTO users (telegram_id, username, first_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE
       SET username    = EXCLUDED.username,
           first_name  = EXCLUDED.first_name,
           updated_at  = NOW()
     RETURNING *`,
    [telegramId, username ?? null, firstName],
  );
  return rows[0];
}

export async function getUserByTelegramId(
  telegramId: number,
): Promise<UserRecord | null> {
  const rows = await query<UserRecord>(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId],
  );
  return rows[0] ?? null;
}

export async function updateUserStep(
  telegramId: number,
  step: OnboardingStep,
): Promise<void> {
  await query(
    'UPDATE users SET onboarding_step = $1, updated_at = NOW() WHERE telegram_id = $2',
    [step, telegramId],
  );
}

export async function confirmAgeAndLegal(telegramId: number): Promise<void> {
  await query(
    `UPDATE users
     SET age_confirmed = TRUE,
         legal_accepted = TRUE,
         onboarding_step = $1,
         updated_at = NOW()
     WHERE telegram_id = $2`,
    [OnboardingStep.DONE, telegramId],
  );
}

export async function updateUserStatus(
  telegramId: number,
  status: OnboardingStatus,
): Promise<void> {
  await query(
    'UPDATE users SET status = $1, updated_at = NOW() WHERE telegram_id = $2',
    [status, telegramId],
  );
}

export async function getPendingUsers(): Promise<UserRecord[]> {
  return query<UserRecord>(
    `SELECT * FROM users WHERE status = 'PENDING' ORDER BY created_at DESC`,
  );
}

export async function getCompletedUsers(): Promise<UserRecord[]> {
  return query<UserRecord>(
    `SELECT * FROM users
     WHERE age_confirmed = TRUE AND legal_accepted = TRUE
     ORDER BY created_at DESC`,
  );
}

export async function setDeclinedAge(telegramId: number): Promise<void> {
  await query(
    `UPDATE users
     SET status = $1, onboarding_step = $2, updated_at = NOW()
     WHERE telegram_id = $3`,
    [OnboardingStatus.DECLINED_AGE, OnboardingStep.DONE, telegramId],
  );
}
