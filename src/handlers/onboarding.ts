// src/handlers/onboarding.ts
//
// Handles the inline button callbacks that drive the multi-step onboarding flow.

import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';
import {
  getUserByTelegramId,
  updateUserStep,
  confirmAgeAndLegal,
  setDeclinedAge,
} from '../services/userRepository';
import {
  statementKeyboard,
  legalKeyboard,
  adminApprovalKeyboard,
} from '../utils/keyboards';
import { OnboardingStep } from '../types';
import { logger } from '../utils/logger';

export function registerOnboardingHandlers(bot: Telegraf<BotContext>): void {
  // ── AGE GATE ─────────────────────────────────────────────────────────────

  bot.action('age_yes', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await getUserByTelegramId(telegramId);
    if (!user || user.onboarding_step !== OnboardingStep.AGE_GATE) return;

    await updateUserStep(telegramId, OnboardingStep.STATEMENT);

    // Edit the original message to remove buttons (clean UX)
    await ctx.editMessageText('🔞 Είσαι 18 ετών ή μεγαλύτερος; ✅');

    // Step 3 — Declaration / statement
    try {
      await ctx.telegram.sendMessage(
        telegramId,
        '📋 *Δήλωση Υπεύθυνης Χρήσης*\n\n' +
        '_Δηλώνω υπεύθυνα ότι είμαι τουλάχιστον 18 ετών και ότι οι πληροφορίες που παρέχω είναι ακριβείς._',
        {
          parse_mode: 'Markdown',
          ...statementKeyboard,
        },
      );
    } catch (err) {
      logger.error(`Failed to send statement message to ${telegramId}:`, err);
      await ctx.answerCbQuery('Πάτα "Start" στο bot για να συνεχίσεις!', { show_alert: true });
    }
  });

  bot.action('age_no', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await setDeclinedAge(telegramId);
    await ctx.editMessageText('🔞 Είσαι 18 ετών ή μεγαλύτερος; ❌');

    try {
      await ctx.telegram.sendMessage(
        telegramId,
        '⛔ *Πρόσβαση Απορρίφθηκε*\n\n' +
        'Η πρόσβαση δεν είναι εφικτή για ανήλικους.',
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      logger.error(`Failed to send rejection message to ${telegramId}:`, err);
    }

    logger.info(`User ${telegramId} rejected at age gate.`);
  });

  // ── STATEMENT ─────────────────────────────────────────────────────────────

  bot.action('statement_confirm', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await getUserByTelegramId(telegramId);
    if (!user || user.onboarding_step !== OnboardingStep.STATEMENT) return;

    await updateUserStep(telegramId, OnboardingStep.LEGAL);
    await ctx.editMessageText(
      '📋 *Δήλωση Υπεύθυνης Χρήσης*\n\n_Επιβεβαιώθηκε ✅_',
      { parse_mode: 'Markdown' },
    );

    // Step 5 — Legal notice
    try {
      await ctx.telegram.sendMessage(
        telegramId,
        '⚖️ *Νομική Ειδοποίηση*\n\n' +
        'Οποιαδήποτε ψευδής δήλωση σχετικά με την ηλικία ενδέχεται να οδηγήσει σε _οριστική αφαίρεση_ από την κοινότητα.',
        {
          parse_mode: 'Markdown',
          ...legalKeyboard,
        },
      );
    } catch (err) {
      logger.error(`Failed to send legal notice to ${telegramId}:`, err);
      await ctx.answerCbQuery('Σφάλμα: Πάτα Start!', { show_alert: true });
    }
  });

  bot.action('statement_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await ctx.editMessageText(
      '📋 *Δήλωση Υπεύθυνης Χρήσης*\n\n_Ακυρώθηκε ❌_',
      { parse_mode: 'Markdown' },
    );

    try {
      await ctx.telegram.sendMessage(
        telegramId,
        '❌ Η διαδικασία ακυρώθηκε. Εάν θέλεις να ξαναδοκιμάσεις, πάτα /start.',
      );
    } catch (err) {
      logger.error(`Failed to send cancellation message to ${telegramId}:`, err);
    }

    logger.info(`User ${telegramId} cancelled at statement step.`);
  });

  // ── LEGAL ─────────────────────────────────────────────────────────────────

  bot.action('legal_understood', async (ctx) => {
    await ctx.answerCbQuery('Ευχαριστούμε! ✅');
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await getUserByTelegramId(telegramId);
    if (!user || user.onboarding_step !== OnboardingStep.LEGAL) return;

    await confirmAgeAndLegal(telegramId);

    await ctx.editMessageText(
      '⚖️ *Νομική Ειδοποίηση*\n\n_Αποδεκτή 👍_',
      { parse_mode: 'Markdown' },
    );

    // Notify user
    try {
      await ctx.telegram.sendMessage(
        telegramId,
        '✅ *Αίτημα Καταχωρήθηκε!*\n\n' +
        'Το αίτημά σου καταχωρήθηκε επιτυχώς! Θα ενημερωθείς μόλις εγκριθεί από τον διαχειριστή. 🙏',
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      logger.error(`Failed to send confirmation to ${telegramId}:`, err);
    }

    // Notify admin
    const adminId = Number(process.env.ADMIN_CHAT_ID);
    if (adminId) {
      const usernameDisplay = user.username ? `@${user.username}` : 'Κανένα';
      const message =
        `🆕 *Νέο Αίτημα Συμμετοχής*\n\n` +
        `👤 Όνομα: *${user.first_name}*\n` +
        `🔖 Username: ${usernameDisplay}\n` +
        `🆔 Telegram ID: \`${user.telegram_id}\`\n` +
        `🕐 Ημερομηνία: ${new Date().toLocaleString('el-GR')}\n` +
        `✅ Ηλικία επιβεβαιώθηκε: Ναι\n` +
        `✅ Νομική δήλωση: Ναι`;

      try {
        await ctx.telegram.sendMessage(adminId, message, {
          parse_mode: 'Markdown',
          ...adminApprovalKeyboard(telegramId),
        });
      } catch (err) {
        logger.error(`Failed to notify admin about user ${telegramId}:`, err);
      }
    }

    logger.info(
      `User ${telegramId} (${user.first_name}) completed onboarding. Status: PENDING.`,
    );
  });
}
