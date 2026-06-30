// src/handlers/start.ts
//
// Handles /start for users who open the bot directly (e.g. via t.me/YourBot)
// without a pending join request.  Also used to re-enter the flow.

import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';
import { getUserByTelegramId, upsertUser, updateUserStep } from '../services/userRepository';
import { ageGateKeyboard } from '../utils/keyboards';
import { OnboardingStatus, OnboardingStep } from '../types';

export function registerStartHandler(bot: Telegraf<BotContext>): void {
  bot.start(async (ctx) => {
    const { id: telegramId, username, first_name: firstName } = ctx.from;

    // Check for existing record
    const existing = await getUserByTelegramId(telegramId);

    if (existing?.status === OnboardingStatus.APPROVED) {
      await ctx.reply(
        '✅ Η πρόσβασή σου στο κανάλι *AlgoBetAi* είναι ήδη ενεργή!',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (existing?.onboarding_step === OnboardingStep.DONE) {
      await ctx.reply(
        '⏳ Το αίτημά σου βρίσκεται σε αναμονή έγκρισης. Θα ειδοποιηθείς σύντομα!',
      );
      return;
    }

    // Fresh start
    await upsertUser(telegramId, username ?? null, firstName);
    await updateUserStep(telegramId, OnboardingStep.AGE_GATE);

    await ctx.reply(
      '👋 Καλωσήρθες στο *AlgoBetAi*!\n\n' +
        'Πριν εγκριθεί το αίτημα συμμετοχής σου, παρακαλούμε ολοκλήρωσε τη διαδικασία επιβεβαίωσης.',
      { parse_mode: 'Markdown' },
    );

    await ctx.reply('🔞 Είσαι 18 ετών ή μεγαλύτερος;', ageGateKeyboard);
  });
}
