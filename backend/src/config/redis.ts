import Redis from 'ioredis';
import { env } from './env.js';

/**
 * Redis Database Separation (Production-Ready)
 * - DB 0: Realtime State (room state, playback position, presence)
 * - DB 1: Pub/Sub (cross-instance message broadcast)
 * - DB 2: Rate Limiting (request throttling per IP/user)
 * - DB 3: BullMQ Jobs (transcoding queue)
 * - DB 4: Sessions (refresh tokens, socket sessions)
 */
export const redisConfig = {
  state: {
    db: 0,
    keyPrefix: 'state:',
  },
  pubsub: {
    db: 1,
  },
  rateLimit: {
    db: 2,
    keyPrefix: 'rl:',
  },
  queue: {
    db: 3,
    keyPrefix: 'bull:',
  },
  session: {
    db: 4,
    keyPrefix: 'sess:',
  },
} as const;

const createRedisClient = (db: number, keyPrefix?: string) => {
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db,
    keyPrefix,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNREFUSED'];
      return targetErrors.some((targetError) => err.message.includes(targetError));
    },
  });
};

// State management (room state, playback, presence)
export const stateRedis = createRedisClient(
  redisConfig.state.db,
  redisConfig.state.keyPrefix
);

// Pub/Sub for cross-instance communication
export const pubRedis = createRedisClient(redisConfig.pubsub.db);
export const subRedis = createRedisClient(redisConfig.pubsub.db);

// Session storage (socket sessions, refresh tokens)
export const sessionRedis = createRedisClient(
  redisConfig.session.db,
  redisConfig.session.keyPrefix
);

// Rate limiting
export const rateLimitRedis = createRedisClient(
  redisConfig.rateLimit.db,
  redisConfig.rateLimit.keyPrefix
);

// BullMQ queue (without keyPrefix - BullMQ handles prefixes internally)
export const queueRedis = createRedisClient(redisConfig.queue.db);

// Graceful shutdown
export const closeRedisConnections = async () => {
  await Promise.all([
    stateRedis.quit(),
    pubRedis.quit(),
    subRedis.quit(),
    sessionRedis.quit(),
    rateLimitRedis.quit(),
    queueRedis.quit(),
  ]);
};
