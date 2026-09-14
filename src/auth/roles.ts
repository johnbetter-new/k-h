import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.ts';

export async function resolveUserRole(telegramId: bigint): Promise<Role> {
  // 1. Initial admin environment check
  if (env.INITIAL_ADMIN_IDS.includes(telegramId)) {
    return Role.ADMIN;
  }

  // 2. Fetch existing database entry
  const user = await prisma.user.findUnique({
    where: { id: telegramId },
    select: { role: true },
  });

  return user?.role ?? Role.USER;
}

export function isSupervisorOrAdmin(role: Role): boolean {
  return role === Role.SUPERVISOR || role === Role.ADMIN;
}

export function isAdmin(role: Role): boolean {
  return role === Role.ADMIN;
}
