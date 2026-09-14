import { Bot } from 'grammy';
import { CustomContext } from '../types/context.js';
import { env } from '../config/env.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { dbSessionMiddleware } from './middlewares/session.middleware.js';
import { startComposer } from './commands/start.js';
import { courseComposer } from './commands/course.js';
import { suggestComposer } from './commands/suggest.js';
import { adminComposer } from './commands/admin.js';
import { suggestionCallbackComposer } from './callbacks/suggestion.callback.js';
import { courseCallbackComposer } from './callbacks/course.callback.js';
import { logger } from '../utils/logger.js';

export function createBot(): Bot<CustomContext> {
  const bot = new Bot<CustomContext>(env.BOT_TOKEN);

  // Global Middlewares
  bot.use(authMiddleware);
  bot.use(dbSessionMiddleware);

  // Modular Composers & Handlers
  bot.use(startComposer);
  bot.use(adminComposer);
  bot.use(suggestComposer);
  bot.use(courseComposer);
  bot.use(suggestionCallbackComposer);
  bot.use(courseCallbackComposer);

  // Centralized Error Boundary
  bot.catch((err) => {
    logger.error(`Error in update ${err.ctx.update.update_id}:`, err.error);
    err.ctx.reply('❌ یک خطای غیرمنتظره رخ داد. لطفاً مجدداً تلاش کنید.').catch(() => {});
  });

  return bot;
}
