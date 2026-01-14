/**
 * Brute-Force Protection Middleware
 * Protects against room code enumeration and password guessing attacks
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { rateLimitRedis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { TooManyRequestsError } from '../errors/index.js';
import { auditLogger } from '../services/audit-logger.js';

/**
 * Brute-force protection configuration
 */
export const BRUTE_FORCE_CONFIG = {
  // Room code attempts
  roomCodeAttemptLimit: 5, // Max wrong codes per IP per hour
  roomCodeBlockDurationMinutes: 60,
  roomCodeWindowMs: 60 * 60 * 1000, // 1 hour

  // Room password attempts
  roomPasswordAttemptLimit: 3, // Max wrong passwords per IP per room
  roomPasswordBlockDurationMinutes: 30,
  roomPasswordWindowMs: 30 * 60 * 1000, // 30 minutes

  // Room join rate limiting
  roomJoinLimitPerMinute: 10, // Max room join attempts per IP per minute
  roomJoinWindowMs: 60 * 1000, // 1 minute
} as const;

/**
 * Get client IP address from request
 */
export function getClientIp(request: FastifyRequest): string {
  // Try X-Forwarded-For header first (for proxies/load balancers)
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP if multiple
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }

  // Try X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket remote address
  return request.ip || 'unknown';
}

/**
 * Check and record failed room code attempt
 */
export async function checkRoomCodeAttempt(
  ip: string,
  roomCode: string
): Promise<void> {
  const key = `brute-force:room-code:${ip}`;
  const now = Date.now();
  const windowStart = now - BRUTE_FORCE_CONFIG.roomCodeWindowMs;

  // Get attempts in current window
  const attempts = await rateLimitRedis.zcount(key, windowStart, now);

  // Check if blocked
  if (attempts >= BRUTE_FORCE_CONFIG.roomCodeAttemptLimit) {
    // Get oldest attempt to calculate retry-after
    const oldest = await rateLimitRedis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1], 10) : now;
    const retryAfter = Math.ceil(
      (oldestTimestamp + BRUTE_FORCE_CONFIG.roomCodeWindowMs - now) / 1000
    );

    logger.warn(
      {
        ip,
        attempts,
        limit: BRUTE_FORCE_CONFIG.roomCodeAttemptLimit,
      },
      'Room code brute-force protection triggered'
    );

    // Log security event
    await auditLogger.log({
      eventType: 'security.brute_force_detected',
      actorIp: ip,
      targetType: 'room',
      targetId: roomCode,
      metadata: {
        attemptType: 'room_code',
        attempts,
        limit: BRUTE_FORCE_CONFIG.roomCodeAttemptLimit,
      },
      success: false,
    });

    throw new TooManyRequestsError(
      `Too many failed room code attempts. Please try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }
}

/**
 * Record failed room code attempt
 */
export async function recordFailedRoomCodeAttempt(
  ip: string,
  roomCode: string
): Promise<void> {
  const key = `brute-force:room-code:${ip}`;
  const now = Date.now();
  const windowStart = now - BRUTE_FORCE_CONFIG.roomCodeWindowMs;

  // Add current attempt
  await rateLimitRedis.zadd(key, now, `${now}:${roomCode}`);

  // Remove old attempts
  await rateLimitRedis.zremrangebyscore(key, '-inf', windowStart);

  // Set expiration
  await rateLimitRedis.expire(
    key,
    Math.ceil(BRUTE_FORCE_CONFIG.roomCodeWindowMs / 1000)
  );

  logger.debug({ ip, roomCode }, 'Recorded failed room code attempt');
}

/**
 * Check and record failed room password attempt
 */
export async function checkRoomPasswordAttempt(
  ip: string,
  roomId: string
): Promise<void> {
  const key = `brute-force:room-password:${ip}:${roomId}`;
  const now = Date.now();
  const windowStart = now - BRUTE_FORCE_CONFIG.roomPasswordWindowMs;

  // Get attempts in current window
  const attempts = await rateLimitRedis.zcount(key, windowStart, now);

  // Check if blocked
  if (attempts >= BRUTE_FORCE_CONFIG.roomPasswordAttemptLimit) {
    const oldest = await rateLimitRedis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1], 10) : now;
    const retryAfter = Math.ceil(
      (oldestTimestamp + BRUTE_FORCE_CONFIG.roomPasswordWindowMs - now) / 1000
    );

    logger.warn(
      {
        ip,
        roomId,
        attempts,
        limit: BRUTE_FORCE_CONFIG.roomPasswordAttemptLimit,
      },
      'Room password brute-force protection triggered'
    );

    // Log security event
    await auditLogger.log({
      eventType: 'security.brute_force_detected',
      actorIp: ip,
      targetType: 'room',
      targetId: roomId,
      metadata: {
        attemptType: 'room_password',
        attempts,
        limit: BRUTE_FORCE_CONFIG.roomPasswordAttemptLimit,
      },
      success: false,
    });

    throw new TooManyRequestsError(
      `Too many failed password attempts for this room. Please try again in ${retryAfter} seconds.`,
      retryAfter
    );
  }
}

/**
 * Record failed room password attempt
 */
export async function recordFailedRoomPasswordAttempt(
  ip: string,
  roomId: string
): Promise<void> {
  const key = `brute-force:room-password:${ip}:${roomId}`;
  const now = Date.now();
  const windowStart = now - BRUTE_FORCE_CONFIG.roomPasswordWindowMs;

  // Add current attempt
  await rateLimitRedis.zadd(key, now, now.toString());

  // Remove old attempts
  await rateLimitRedis.zremrangebyscore(key, '-inf', windowStart);

  // Set expiration
  await rateLimitRedis.expire(
    key,
    Math.ceil(BRUTE_FORCE_CONFIG.roomPasswordWindowMs / 1000)
  );

  logger.debug({ ip, roomId }, 'Recorded failed room password attempt');
}

/**
 * Check room join rate limit
 */
export async function checkRoomJoinRateLimit(ip: string): Promise<void> {
  const key = `rate-limit:room-join:${ip}`;
  const now = Date.now();
  const windowStart = now - BRUTE_FORCE_CONFIG.roomJoinWindowMs;

  // Get attempts in current window
  const attempts = await rateLimitRedis.zcount(key, windowStart, now);

  // Check if over limit
  if (attempts >= BRUTE_FORCE_CONFIG.roomJoinLimitPerMinute) {
    logger.warn(
      {
        ip,
        attempts,
        limit: BRUTE_FORCE_CONFIG.roomJoinLimitPerMinute,
      },
      'Room join rate limit exceeded'
    );

    // Log security event
    await auditLogger.log({
      eventType: 'security.rate_limit_exceeded',
      actorIp: ip,
      targetType: 'system',
      targetId: 'room_join',
      metadata: {
        attempts,
        limit: BRUTE_FORCE_CONFIG.roomJoinLimitPerMinute,
        windowMs: BRUTE_FORCE_CONFIG.roomJoinWindowMs,
      },
      success: false,
    });

    throw new TooManyRequestsError(
      `Too many room join attempts. Please try again in a moment.`,
      60
    );
  }

  // Record this attempt
  await rateLimitRedis.zadd(key, now, now.toString());

  // Remove old attempts
  await rateLimitRedis.zremrangebyscore(key, '-inf', windowStart);

  // Set expiration
  await rateLimitRedis.expire(
    key,
    Math.ceil(BRUTE_FORCE_CONFIG.roomJoinWindowMs / 1000)
  );
}

/**
 * Clear successful authentication attempts (on successful join)
 */
export async function clearRoomAttempts(ip: string, roomId: string): Promise<void> {
  await Promise.all([
    rateLimitRedis.del(`brute-force:room-code:${ip}`),
    rateLimitRedis.del(`brute-force:room-password:${ip}:${roomId}`),
  ]);
}

/**
 * Fastify middleware for room brute-force protection
 */
export async function roomBruteForceProtection(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ip = getClientIp(request);

  try {
    // Check room join rate limit
    await checkRoomJoinRateLimit(ip);
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: error.message,
        retryAfter: error.retryAfter,
      });
    }
    throw error;
  }
}
