/**
 * Database Query Optimization Guidelines and Utilities
 *
 * This file contains utilities and best practices for optimizing database queries
 */

import { Prisma } from '@prisma/client';

/**
 * Query Performance Tips:
 *
 * 1. Use select to fetch only needed fields
 * 2. Use include carefully - avoid over-fetching relations
 * 3. Add database indexes for frequently queried fields
 * 4. Use pagination (take/skip) for large result sets
 * 5. Use transactions for multiple related operations
 * 6. Use connection pooling (configured in Prisma client)
 * 7. Monitor slow queries in production
 * 8. Use Redis caching for frequently accessed data
 */

/**
 * Standard pagination defaults
 */
export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Get pagination params with validation
 */
export function getPaginationParams(
  page?: number,
  pageSize?: number
): { skip: number; take: number } {
  const validPage = Math.max(1, page || 1);
  const validPageSize = Math.min(
    PAGINATION_DEFAULTS.MAX_PAGE_SIZE,
    Math.max(1, pageSize || PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE)
  );

  return {
    skip: (validPage - 1) * validPageSize,
    take: validPageSize,
  };
}

/**
 * Common select fields for user queries (to avoid over-fetching)
 */
export const USER_SELECT_MINIMAL = {
  id: true,
  username: true,
  avatarUrl: true,
} as const;

export const USER_SELECT_PUBLIC = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
} as const;

/**
 * Common select fields for room queries
 */
export const ROOM_SELECT_BASIC = {
  id: true,
  code: true,
  name: true,
  ownerId: true,
  maxParticipants: true,
  createdAt: true,
  expiresAt: true,
} as const;

/**
 * Batch operations helper
 * Use for creating/updating multiple records efficiently
 */
export async function batchOperation<T>(
  items: T[],
  operation: (batch: T[]) => Promise<any>,
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operation(batch);
  }
}

/**
 * Database performance monitoring middleware
 * Logs slow queries in development
 */
export function createQueryLogger(slowQueryThreshold: number = 1000) {
  return Prisma.defineExtension({
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;

        if (duration > slowQueryThreshold) {
          console.warn(`[Slow Query] ${model}.${operation} took ${duration}ms`, {
            args: JSON.stringify(args),
          });
        }

        return result;
      },
    },
  });
}

/**
 * Common query optimizations:
 *
 * Before:
 * const users = await prisma.user.findMany({
 *   include: { posts: true, comments: true, friends: true }
 * });
 *
 * After:
 * const users = await prisma.user.findMany({
 *   select: {
 *     id: true,
 *     username: true,
 *     _count: { select: { posts: true, comments: true } }
 *   },
 *   take: 20
 * });
 */

/**
 * Cache key generators for Redis
 */
export const CacheKeys = {
  room: (code: string) => `room:${code}`,
  roomParticipants: (roomId: string) => `room:${roomId}:participants`,
  user: (userId: string) => `user:${userId}`,
  roomState: (roomId: string) => `room:${roomId}:state`,
} as const;

/**
 * Recommended database indexes (add these to schema.prisma):
 *
 * model Room {
 *   code String @unique @@index([code])
 *   ownerId String @@index([ownerId])
 *   expiresAt DateTime @@index([expiresAt])
 * }
 *
 * model RoomParticipant {
 *   roomId String @@index([roomId])
 *   userId String? @@index([userId])
 *   @@index([roomId, userId])
 * }
 *
 * model User {
 *   username String @unique @@index([username])
 *   email String @unique @@index([email])
 * }
 */
