import express from 'express';
import { webhookCallback } from 'grammy';
import { Bot } from 'grammy';
import { CustomContext } from '../types/context.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';

export function createWebServer(bot: Bot<CustomContext>) {
  const app = express();
  app.use(express.json());

  // Health Check Endpoint
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch {
      res.status(500).json({ status: 'error', message: 'Database unhealthy' });
    }
  });

  // Secure Telegram Webhook Handler Endpoint
  if (env.WEBHOOK_DOMAIN) {
    app.use('/webhook', webhookCallback(bot, 'express', {
      secretToken: env.WEBHOOK_SECRET,
    }));
  }

  return app;
}
