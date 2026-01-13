/**
 * SyncWatch Backend Server
 * Main application entry point
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { registerRoomRoutes, setupErrorHandler } from './modules/rooms/routes.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

async function start() {
  try {
    // Register plugins
    await app.register(cors, {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    });

    await app.register(helmet, {
      contentSecurityPolicy: false, // Disable for development
    });

    await app.register(jwt, {
      secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    });

    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Setup error handler
    setupErrorHandler(app);

    // Register routes
    await registerRoomRoutes(app);

    // Health check endpoint
    app.get('/health', async () => ({ status: 'ok', timestamp: new Date() }));

    // Start server
    const port = parseInt(process.env.PORT || '4000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
