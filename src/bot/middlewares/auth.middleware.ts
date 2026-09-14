import { Middleware } from 'grammy';
import { CustomContext } from '../../types/context.js';
import { prisma } from '../../database/prisma.js';
import { resolveUserRole } from '../../auth/roles.js';

export const authMiddleware: Middleware<CustomContext> = async (ctx, next) => {
  const from = ctx.from;
  if (!from) return;

  const telegramId = BigInt(from.id);
  const role = await resolveUserRole(telegramId);

  const dbUser = await prisma.user.upsert({
    where: { id: telegramId },
    update: {
      firstName: from.first_name,
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      role,
    },
    create: {
      id: telegramId,
      firstName: from.first_name,
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      role,
    },
  });

  ctx.userRole = dbUser.role;
  ctx.dbUser = dbUser;

  // Admins must never be blocked by stale moderation records.
  if (dbUser.role !== 'ADMIN') {
    const now = new Date();
    if (dbUser.isBanned && (!dbUser.bannedUntil || dbUser.bannedUntil > now)) {
      await ctx.reply('🚫 دسترسی شما به ربات مسدود شده است.');
      return;
    }
    if (dbUser.isBanned && dbUser.bannedUntil && dbUser.bannedUntil <= now) {
      await prisma.user.update({ where: { id: telegramId }, data: { isBanned: false, bannedUntil: null, banReason: null } });
    }
    if (dbUser.isRestricted && (!dbUser.restrictedUntil || dbUser.restrictedUntil > now)) {
      await ctx.reply('⛔ دسترسی شما به امکانات ربات محدود شده است.');
      return;
    }
    if (dbUser.isRestricted && dbUser.restrictedUntil && dbUser.restrictedUntil <= now) {
      await prisma.user.update({ where: { id: telegramId }, data: { isRestricted: false, restrictedUntil: null, restrictionReason: null } });
    }
  }

  await next();
};
