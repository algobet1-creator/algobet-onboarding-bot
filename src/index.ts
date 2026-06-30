// src/index.ts — AlgoBetAi Telegram Onboarding Bot

import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { BotContext } from './types/context';
import { initDb } from './db';
import { logger } from './utils/logger';
import { registerStartHandler } from './handlers/start';
import { registerJoinRequestHandler } from './handlers/joinRequest';
import { registerOnboardingHandlers } from './handlers/onboarding';
import { registerAdminHandlers } from './handlers/admin';

// ── Validate required environment variables ──────────────────────────────────

const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL', 'ADMIN_CHAT_ID', 'CHANNEL_ID'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Init DB schema
  await initDb();

  // 2. Create bot instance
  const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN!);

  // 3. Register handlers in priority order
  registerStartHandler(bot);
  registerJoinRequestHandler(bot);
  registerOnboardingHandlers(bot);
  registerAdminHandlers(bot); // admin must come last (has a catch-all message handler)

  // 4. Global error handler — prevents the process from crashing on unhandled errors
  bot.catch((err, ctx) => {
    logger.error(`Unhandled bot error for update ${ctx.updateType}:`, err);
  });

  // 5. Graceful shutdown
  process.once('SIGINT', () => {
    logger.info('SIGINT received — stopping bot...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    logger.info('SIGTERM received — stopping bot...');
    bot.stop('SIGTERM');
  });

  // 6. Launch
  await bot.launch();

  const botInfo = await bot.telegram.getMe();
  logger.info(`\n${'='.repeat(50)}`);
  logger.info(`AlgoBetAi Onboarding Bot is running!`);
  logger.info(`Username : @${botInfo.username}`);
  logger.info(`Admin ID : ${process.env.ADMIN_CHAT_ID}`);
  logger.info(`Channel  : ${process.env.CHANNEL_ID}`);
  logger.info(`${'='.repeat(50)}\n`);
  logger.info('TIP: Forward a message from your private channel to the bot to detect its ID automatically.');
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
