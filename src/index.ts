import { createBot } from './bot/bot.js';
import { createWebServer } from './web/server.js';
import { connectDatabase, prisma } from './database/prisma.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { Server } from 'node:http';
async function bootstrap(){ logger.info('🚀 Starting KIAU Hoosh Bot application...'); await connectDatabase(); const bot=createBot(); const app=createWebServer(bot); const server:Server=await new Promise((resolve,reject)=>{const s=app.listen(env.PORT,()=>resolve(s)); s.on('error',reject);}); logger.info(`🌐 Web server running on port ${env.PORT}`); if(env.WEBHOOK_DOMAIN){ const url=new URL('/webhook',env.WEBHOOK_DOMAIN).toString(); await bot.api.setWebhook(url,{secret_token:env.WEBHOOK_SECRET}); logger.info(`🔗 Webhook set successfully to: ${url}`); } else { await bot.api.deleteWebhook(); bot.start({onStart:i=>logger.info(`🤖 Bot started polling as @${i.username}`)}); } const shutdown=async()=>{logger.info('Shutting down...'); bot.stop(); await new Promise<void>(r=>server.close(()=>r())); await prisma.$disconnect(); process.exit(0);}; process.once('SIGINT',shutdown); process.once('SIGTERM',shutdown); }
bootstrap().catch(err=>{logger.error('Fatal failure during initialization:',err);process.exit(1);});
