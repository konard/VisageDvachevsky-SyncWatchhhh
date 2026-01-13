/**
 * Redis Client
 * Singleton instance for Redis connections with pub/sub support
 */

import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisPub: Redis | undefined;
  redisSub: Redis | undefined;
};

/**
 * Main Redis client for general operations (GET, SET, etc.)
 */
export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

/**
 * Dedicated Redis client for publishing messages
 * Note: Separate clients are recommended for pub/sub operations
 */
export const redisPub =
  globalForRedis.redisPub ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

/**
 * Dedicated Redis client for subscribing to channels
 * Note: This client should ONLY be used for SUBSCRIBE/PSUBSCRIBE operations
 */
export const redisSub =
  globalForRedis.redisSub ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

// Preserve instances in development to avoid connection leaks
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
  globalForRedis.redisPub = redisPub;
  globalForRedis.redisSub = redisSub;
}

// Error handling
redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisPub.on('error', (err) => {
  console.error('Redis Pub Client Error:', err);
});

redisSub.on('error', (err) => {
  console.error('Redis Sub Client Error:', err);
});

// Connection logging
redis.on('connect', () => {
  console.log('Redis Client: Connected');
});

redisPub.on('connect', () => {
  console.log('Redis Pub Client: Connected');
});

redisSub.on('connect', () => {
  console.log('Redis Sub Client: Connected');
});
