import { redis } from '../../database/redis.js';
import { logger } from '../../config/logger.js';

/**
 * Rate limiter configuration
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30;

/**
 * Check if user has exceeded rate limit for chat messages
 *
 * Uses Redis sliding window algorithm to track message count
 *
 * @param userId User ID
 * @param roomCode Room code
 * @returns true if rate limited, false otherwise
 */
export async function checkRateLimit(userId: string, roomCode: string): Promise<boolean> {
  try {
    const key = `chat:ratelimit:${roomCode}:${userId}`;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count messages in the current window
    const count = await redis.zcard(key);

    if (count >= MAX_MESSAGES_PER_WINDOW) {
      logger.debug({ userId, roomCode, count }, 'User rate limited');
      return true;
    }

    // Add current message timestamp
    await redis.zadd(key, now, `${now}`);

    // Set expiry on the key (cleanup)
    await redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));

    return false;
  } catch (error) {
    logger.error({ error: (error as Error).message, userId, roomCode }, 'Error checking rate limit');
    // On error, allow the message (fail open)
    return false;
  }
}
