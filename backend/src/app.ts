import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { rateLimitRedis } from './config/redis.js';
import { authRoutes } from './modules/auth/routes.js';
import { usersRoutes } from './modules/users/routes.js';
import { registerRoomRoutes } from './modules/rooms/routes.js';
import { videoRoutes } from './modules/videos/routes.js';
import { moderationRoutes } from './modules/moderation/routes.js';

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

  // CORS - Strict origin validation
  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Parse allowed origins from env (comma-separated)
      const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, 'CORS origin rejected');
        callback(new Error('CORS not allowed'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Security headers with strict CSP
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.youtube.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'https://storage.syncwatch.example'],
        frameSrc: ['https://www.youtube.com'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding YouTube videos
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

  // Register API routes
  const { friendsRoutes } = await import('./modules/friends/routes.js');

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(friendsRoutes, { prefix: '/api' });
  await app.register(usersRoutes, { prefix: '/api' });
  await app.register(registerRoomRoutes, { prefix: '/api/rooms' });
  await app.register(videoRoutes, { prefix: '/api/videos' });
  await app.register(moderationRoutes, { prefix: '/api/moderation' });

  return app;
}
