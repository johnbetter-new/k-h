"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_js_1 = require("./bot/bot.js");
const server_js_1 = require("./web/server.js");
const prisma_js_1 = require("./database/prisma.js");
const env_js_1 = require("./config/env.js");
const logger_js_1 = require("./utils/logger.js");
async function bootstrap() { logger_js_1.logger.info('🚀 Starting KIAU Hoosh Bot application...'); await (0, prisma_js_1.connectDatabase)(); const bot = (0, bot_js_1.createBot)(); const app = (0, server_js_1.createWebServer)(bot); const server = await new Promise((resolve, reject) => { const s = app.listen(env_js_1.env.PORT, () => resolve(s)); s.on('error', reject); }); logger_js_1.logger.info(`🌐 Web server running on port ${env_js_1.env.PORT}`); if (env_js_1.env.WEBHOOK_DOMAIN) {
    const url = new URL('/webhook', env_js_1.env.WEBHOOK_DOMAIN).toString();
    await bot.api.setWebhook(url, { secret_token: env_js_1.env.WEBHOOK_SECRET });
    logger_js_1.logger.info(`🔗 Webhook set successfully to: ${url}`);
}
else {
    await bot.api.deleteWebhook();
    bot.start({ onStart: i => logger_js_1.logger.info(`🤖 Bot started polling as @${i.username}`) });
} const shutdown = async () => { logger_js_1.logger.info('Shutting down...'); bot.stop(); await new Promise(r => server.close(() => r())); await prisma_js_1.prisma.$disconnect(); process.exit(0); }; process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown); }
bootstrap().catch(err => { logger_js_1.logger.error('Fatal failure during initialization:', err); process.exit(1); });
