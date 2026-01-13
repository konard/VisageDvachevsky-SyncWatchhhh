import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/routes.js';
import { prisma } from './common/utils/prisma.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false, // Allow for development
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes with rate limiting for auth endpoints
await fastify.register(async (fastify) => {
  await fastify.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  });
});

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, closing server...`);
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  });
});

// Start server
try {
  const port = parseInt(env.PORT, 10);
  await fastify.listen({ port, host: env.HOST });
  fastify.log.info(`Server listening on http://${env.HOST}:${port}`);
} catch (error) {
  fastify.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
