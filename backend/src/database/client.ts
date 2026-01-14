/**
 * Prisma Database Client
 * Singleton instance for database access with performance optimizations
 */

import { PrismaClient } from '@prisma/client';
import { createQueryLogger } from './optimizations.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create base client with optimized configuration
const basePrisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  // Connection pooling is handled by Prisma automatically
  // Default pool size: 10 connections
});

// Extend with performance monitoring
export const prisma = globalForPrisma.prisma ?? basePrisma.$extends(
  // Add query performance monitoring
  process.env.NODE_ENV === 'development'
    ? createQueryLogger(1000) // Log queries slower than 1s in dev
    : createQueryLogger(5000)  // Log queries slower than 5s in prod
) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
