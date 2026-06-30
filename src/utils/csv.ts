// src/utils/csv.ts

import { UserRecord } from '../types';

export function generateCsv(users: UserRecord[]): string {
  const headers = [
    'ID',
    'Telegram ID',
    'Username',
    'First Name',
    'Age Confirmed',
    'Legal Accepted',
    'Status',
    'Onboarding Step',
    'Created At',
    'Updated At',
  ].join(',');

  const rows = users.map((u) =>
    [
      u.id,
      u.telegram_id,
      u.username ? `@${u.username}` : 'N/A',
      `"${u.first_name.replace(/"/g, '""')}"`,
      u.age_confirmed,
      u.legal_accepted,
      u.status,
      u.onboarding_step,
      new Date(u.created_at).toISOString(),
      new Date(u.updated_at).toISOString(),
    ].join(','),
  );

  return [headers, ...rows].join('\n');
}
