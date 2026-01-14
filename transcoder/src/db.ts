import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('error', (e: any) => {
  logger.error({ message: e.message, target: e.target }, 'Prisma error');
});

prisma.$on('warn', (e: any) => {
  logger.warn({ message: e.message, target: e.target }, 'Prisma warning');
});

export const closePrisma = async () => {
  await prisma.$disconnect();
};
