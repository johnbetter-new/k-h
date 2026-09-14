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
      role: role,
    },
    create: {
      id: telegramId,
      firstName: from.first_name,
      lastName: from.last_name ?? null,
      username: from.username ?? null,
      role: role,
    },
  });

  ctx.userRole = dbUser.role;
  ctx.dbUser = dbUser;

  return next();
};
