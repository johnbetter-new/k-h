import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';

export async function resolveUserRole(telegramId: bigint): Promise<Role> {
  if (env.INITIAL_ADMIN_IDS.includes(telegramId)) return Role.ADMIN;
  const user = await prisma.user.findUnique({ where: { id: telegramId }, select: { role: true } });
  return user?.role ?? Role.USER;
}
export const isSupervisorOrAdmin = (role: Role) => role === Role.SUPERVISOR || role === Role.ADMIN;
export const isAdmin = (role: Role) => role === Role.ADMIN;
