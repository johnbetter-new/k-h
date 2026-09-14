import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Successfully connected to PostgreSQL Database via Prisma');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}
