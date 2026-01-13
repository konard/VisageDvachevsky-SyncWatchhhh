import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Log Prisma queries in development
prisma.$on('query', (e) => {
  logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma query');
});

prisma.$on('error', (e) => {
  logger.error({ message: e.message, target: e.target }, 'Prisma error');
});

prisma.$on('warn', (e) => {
  logger.warn({ message: e.message, target: e.target }, 'Prisma warning');
});

export const closePrisma = async () => {
  await prisma.$disconnect();
};
