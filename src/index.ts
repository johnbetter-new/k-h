import { createBot } from './bot/bot.js';
import { createWebServer } from './web/server.js';
import { connectDatabase } from './database/prisma.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('🚀 Starting KIAU Hoosh Bot application...');

  await connectDatabase();

  const bot = createBot();
  const app = createWebServer(bot);

  app.listen(env.PORT, async () => {
    logger.info(`🌐 Web server running on port ${env.PORT}`);

    if (env.WEBHOOK_DOMAIN) {
      const webhookUrl = `${env.WEBHOOK_DOMAIN}/webhook`;
      await bot.api.setWebhook(webhookUrl, {
        secret_token: env.WEBHOOK_SECRET,
      });
      logger.info(`🔗 Webhook set successfully to: ${webhookUrl}`);
    } else {
      logger.info('⚠️ WEBHOOK_DOMAIN not provided. Falling back to Long Polling...');
      await bot.api.deleteWebhook();
      bot.start({
        onStart: (info) => logger.info(`🤖 Bot started polling as @${info.username}`),
      });
    }
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal failure during initialization:', err);
  process.exit(1);
});
