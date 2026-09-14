import { Middleware } from 'grammy';
import { CustomContext, SessionData } from '../../types/context.js';
import { prisma } from '../../database/prisma.js';

/**
 * Persistent Postgres Database Session Storage for grammY
 */
export const dbSessionMiddleware: Middleware<CustomContext> = async (ctx, next) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;

  if (!chatId || !userId) return next();

  const sessionKey = `session:${chatId}:${userId}`;

  // Read current session from DB
  const dbSession = await prisma.botSession.findUnique({
    where: { key: sessionKey },
  });

  let sessionData: SessionData = { step: 'IDLE' };
  if (dbSession) {
    try {
      sessionData = JSON.parse(dbSession.value);
    } catch {
      sessionData = { step: 'IDLE' };
    }
  }

  ctx.session = sessionData;

  await next();

  // Save session back to DB
  await prisma.botSession.upsert({
    where: { key: sessionKey },
    update: {
      value: JSON.stringify(ctx.session),
      userId: BigInt(userId),
    },
    create: {
      key: sessionKey,
      value: JSON.stringify(ctx.session),
      userId: BigInt(userId),
    },
  });
};
