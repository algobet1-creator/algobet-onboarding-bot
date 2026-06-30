// src/handlers/admin.ts
//
// Admin inline button callbacks (approve / reject) and text commands
// (/pending, /export).  All handlers validate that the caller is the
// configured ADMIN_CHAT_ID before doing anything.

import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';
import {
  getUserByTelegramId,
  getPendingUsers,
  getCompletedUsers,
  updateUserStatus,
} from '../services/userRepository';
import { OnboardingStatus } from '../types';
import { generateCsv } from '../utils/csv';
import { logger } from '../utils/logger';

function isAdmin(ctx: BotContext): boolean {
  const adminId = Number(process.env.ADMIN_CHAT_ID);
  return ctx.from?.id === adminId;
}

export function registerAdminHandlers(bot: Telegraf<BotContext>): void {
  // ── APPROVE ───────────────────────────────────────────────────────────────

  bot.action(/^admin_approve_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery('⛔ Δεν έχεις δικαίωμα.');
      return;
    }

    const telegramId = Number(ctx.match[1]);
    const channelId = Number(process.env.CHANNEL_ID);

    try {
    await ctx.telegram.approveChatJoinRequest(channelId, telegramId);
    await updateUserStatus(telegramId, OnboardingStatus.APPROVED);

    await ctx.answerCbQuery('✅ Εγκρίθηκε!');
    await ctx.editMessageReplyMarkup(undefined);

    const user = await getUserByTelegramId(telegramId);
    await ctx.editMessageText(
        (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message ? ctx.callbackQuery.message.text : '') + 
        '\n\n✅ *ΕΓΚΡΙΘΗΚΕ*',
        { parse_mode: 'Markdown' }
    );

    await ctx.telegram.sendMessage(telegramId, '🚀 *Καλωσόρισες!*\nΤο αίτημά σου εγκρίθηκε!', { parse_mode: 'Markdown' });
} catch (err: any) {
    if (err.description && err.description.includes('HIDE_REQUESTER_MISSING')) {
        await ctx.answerCbQuery('⚠️ Το αίτημα έχει λήξει.');
        await ctx.editMessageText('Το αίτημα αυτό δεν είναι πλέον έγκυρο.');
    } else {
        await ctx.answerCbQuery('❌ Σφάλμα.');
        logger.error(`Failed to approve user ${telegramId}:`, err);
    }
}
  });

  // ── REJECT ────────────────────────────────────────────────────────────────

  bot.action(/^admin_reject_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery('⛔ Δεν έχεις δικαίωμα.');
      return;
    }

    const telegramId = Number(ctx.match[1]);
    const channelId = Number(process.env.CHANNEL_ID);

    try {
      await ctx.telegram.declineChatJoinRequest(channelId, telegramId);
      await updateUserStatus(telegramId, OnboardingStatus.REJECTED);

      await ctx.answerCbQuery('❌ Απορρίφθηκε.');
      await ctx.editMessageText(
        (ctx.callbackQuery.message &&
        'text' in ctx.callbackQuery.message
          ? ctx.callbackQuery.message.text
          : '') + '\n\n❌ *ΑΠΟΡΡΙΦΘΗΚΕ*',
        { parse_mode: 'Markdown' },
      );

      // Notify the user
      await ctx.telegram.sendMessage(
        telegramId,
        '😔 Το αίτημά σου δεν εγκρίθηκε από τον διαχειριστή. ' +
          'Εάν πιστεύεις ότι πρόκειται για λάθος, επικοινώνησε μαζί μας.',
      );

      logger.info(`Admin rejected user ${telegramId}.`);
    } catch (err) {
      await ctx.answerCbQuery('❌ Σφάλμα κατά την απόρριψη.');
      logger.error(`Failed to reject user ${telegramId}:`, err);
    }
  });

  // ── /pending command ──────────────────────────────────────────────────────

  bot.command('pending', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('⛔ Δεν έχεις δικαίωμα.');
      return;
    }

    const users = await getPendingUsers();

    if (users.length === 0) {
      await ctx.reply('✅ Δεν υπάρχουν εκκρεμή αιτήματα.');
      return;
    }

    const lines = users.map((u, i) => {
      const username = u.username ? `@${u.username}` : 'N/A';
      return (
        `${i + 1}. *${u.first_name}* (${username})\n` +
        `   🆔 \`${u.telegram_id}\`\n` +
        `   📅 ${new Date(u.created_at).toLocaleString('el-GR')}`
      );
    });

    await ctx.reply(
      `📋 *Εκκρεμή Αιτήματα (${users.length})*\n\n${lines.join('\n\n')}`,
      { parse_mode: 'Markdown' },
    );
  });

  // ── /export command ───────────────────────────────────────────────────────

  bot.command('export', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('⛔ Δεν έχεις δικαίωμα.');
      return;
    }

    const users = await getCompletedUsers();

    if (users.length === 0) {
      await ctx.reply('ℹ️ Δεν υπάρχουν εγγεγραμμένοι χρήστες για export.');
      return;
    }

    const csv = generateCsv(users);
    const buffer = Buffer.from(csv, 'utf-8');

    const filename = `algobet_users_${new Date().toISOString().slice(0, 10)}.csv`;

    await ctx.replyWithDocument(
      { source: buffer, filename },
      { caption: `📊 Export: ${users.length} χρήστες — ${filename}` },
    );

    logger.info(`Admin exported ${users.length} users to CSV.`);
  });

  // ── Channel ID helper ─────────────────────────────────────────────────────
  // If the admin forwards any message from the target channel, the bot will
  // print the channel ID to stdout so it can be copied into .env

  bot.on('message', async (ctx, next) => {
    const msg = ctx.message;
    if (
      isAdmin(ctx) &&
      'forward_origin' in msg &&
      msg.forward_origin &&
      msg.forward_origin.type === 'channel'
    ) {
      const channelId = msg.forward_origin.chat.id;
      logger.info(
        `\n${'='.repeat(50)}\n` +
          `CHANNEL ID DETECTED: ${channelId}\n` +
          `Add this to your .env → CHANNEL_ID=${channelId}\n` +
          `${'='.repeat(50)}`,
      );
      await ctx.reply(
        `✅ *Channel ID εντοπίστηκε!*\n\n\`CHANNEL_ID=${channelId}\`\n\nΑντέγραψε το στο .env σου.`,
        { parse_mode: 'Markdown' },
      );
      return; // don't fall through
    }
    return next();
  });
}
