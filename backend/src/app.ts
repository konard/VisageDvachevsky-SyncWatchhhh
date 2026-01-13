import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { rateLimitRedis } from './config/redis.js';

/**
 * Create and configure Fastify application
 */
export async function createApp() {
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable CSP for API
  });

  // JWT authentication
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: rateLimitRedis,
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'SyncWatch API',
      version: '0.1.0',
      status: 'running',
    };
  });

  // TODO: Register API routes here
  // app.register(authRoutes, { prefix: '/api/auth' });
  // app.register(roomRoutes, { prefix: '/api/rooms' });
  // app.register(userRoutes, { prefix: '/api/users' });

  return app;
}
