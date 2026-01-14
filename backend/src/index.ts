import { createApp } from './app.js';
import { createSocketServer, closeSocketServer } from './websocket/socket.js';
import { closeRedisConnections } from './config/redis.js';
import { closePrisma } from './config/prisma.js';
import { ensureBuckets } from './config/minio.js';
import { closeQueue } from './config/queue.js';
import { logger } from './config/logger.js';
import { env } from './config/env.js';

/**
 * Start the server
 */
async function start() {
  try {
    // Ensure MinIO buckets exist
    await ensureBuckets();
    logger.info('MinIO buckets initialized');

    // Create Fastify app
    const app = await createApp();

    // Start HTTP server
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    // Get HTTP server instance
    const httpServer = app.server;

    // Create Socket.io server
    const io = createSocketServer(httpServer);

    logger.info(
      {
        port: env.PORT,
        host: env.HOST,
        nodeEnv: env.NODE_ENV,
      },
      'SyncWatch server started successfully'
    );

    // Graceful shutdown
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      // Prevent multiple shutdown attempts
      if (isShuttingDown) {
        logger.warn('Shutdown already in progress');
        return;
      }
      isShuttingDown = true;

      logger.info({ signal }, 'Graceful shutdown initiated');

      // Set hard timeout (30 seconds)
      const forceExitTimer = setTimeout(() => {
        logger.error('Forced exit after timeout');
        process.exit(1);
      }, 30000);

      try {
        // 1. Stop accepting new HTTP connections
        httpServer.close(() => {
          logger.info('HTTP server stopped accepting new connections');
        });

        // 2. Notify WebSocket clients and close connections
        await closeSocketServer(io);

        // 3. Close Fastify server (wait for in-flight requests)
        await app.close();
        logger.info('Fastify server closed');

        // 4. Pause and wait for job queues to finish active jobs
        await closeQueue();
        logger.info('Job queues closed');

        // 5. Close Redis connections
        await closeRedisConnections();
        logger.info('Redis connections closed');

        // 6. Close Prisma database connection
        await closePrisma();
        logger.info('Database connection closed');

        clearTimeout(forceExitTimer);
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error({ error: (error as Error).message, stack: (error as Error).stack }, 'Error during shutdown');
        clearTimeout(forceExitTimer);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled promise rejection');
      shutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    logger.error({ error: (error as Error).message, stack: (error as Error).stack }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();
