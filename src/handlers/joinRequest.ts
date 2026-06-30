// src/handlers/joinRequest.ts
//
// Fires when a user clicks the private channel link and taps "Request to Join".
// The bot immediately opens a private DM and starts the onboarding flow.

import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';
import { upsertUser, updateUserStep } from '../services/userRepository';
import { ageGateKeyboard } from '../utils/keyboards';
import { OnboardingStep } from '../types';
import { logger } from '../utils/logger';

export function registerJoinRequestHandler(bot: Telegraf<BotContext>): void {
  // @ts-expect-error — Telegraf typings don't yet expose chat_join_request
  bot.on('chat_join_request', async (ctx) => {
    const request = (ctx.update as Record<string, unknown>)
      .chat_join_request as {
      from: { id: number; username?: string; first_name: string };
      chat: { id: number };
    };

    const { id: telegramId, username, first_name: firstName } = request.from;

    logger.info(
      `Join request from ${firstName} (${telegramId}) @${username ?? 'no-username'}`,
    );

    try {
      // Persist the user immediately so we can track step
      await upsertUser(telegramId, username ?? null, firstName);
      await updateUserStep(telegramId, OnboardingStep.WELCOME);

      // Step 1 — Welcome
      await ctx.telegram.sendMessage(
        telegramId,
        '👋 Καλωσήρθες στο *AlgoBetAi*!\n\n' +
          'Πριν εγκριθεί το αίτημα συμμετοχής σου, παρακαλούμε ολοκλήρωσε τη διαδικασία επιβεβαίωσης.',
        { parse_mode: 'Markdown' },
      );

      // Small delay for UX feel
      await sleep(800);

      // Step 2 — Age gate
      await updateUserStep(telegramId, OnboardingStep.AGE_GATE);
      await ctx.telegram.sendMessage(
        telegramId,
        '🔞 Είσαι 18 ετών ή μεγαλύτερος;',
        ageGateKeyboard,
      );
    } catch (err) {
      logger.error(
        `Failed to send onboarding DM to user ${telegramId}. They may not have started the bot yet.`,
        err,
      );
      // Common case: user has never messaged the bot → can't DM them.
      // Nothing to do here; they'll need to /start the bot first.
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
