// src/utils/keyboards.ts

import { Markup } from 'telegraf';

export const ageGateKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ ΝΑΙ, είμαι 18+', 'age_yes'),
    Markup.button.callback('❌ ΟΧΙ', 'age_no'),
  ],
]);

export const statementKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('Επιβεβαίωση ✅', 'statement_confirm'),
    Markup.button.callback('Ακύρωση ❌', 'statement_cancel'),
  ],
]);

export const legalKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Το κατάλαβα 👍', 'legal_understood')],
]);

export const adminApprovalKeyboard = (telegramId: number) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback('Approve ✅', `admin_approve_${telegramId}`),
      Markup.button.callback('Reject ❌', `admin_reject_${telegramId}`),
    ],
  ]);
