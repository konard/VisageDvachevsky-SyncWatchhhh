import { createApp } from './app.js';
import { createSocketServer, closeSocketServer } from './websocket/socket.js';
import { closeRedisConnections } from './config/redis.js';
import { closePrisma } from './config/prisma.js';
import { ensureBuckets } from './config/minio.js';
import { closeQueue } from './config/queue.js';
import { logger } from './config/logger.js';
import { env } from './config/env.js';
import { scheduleAuditLogCleanup } from './jobs/audit-cleanup.js';

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

    // Schedule audit log cleanup (runs daily at 2 AM)
    scheduleAuditLogCleanup();

    logger.info(
      {
        port: env.PORT,
        host: env.HOST,
        nodeEnv: env.NODE_ENV,
      },
      'SyncWatch server started successfully'
    );

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      try {
        // Close Socket.io server
        await closeSocketServer(io);

        // Close Fastify server
        await app.close();

        // Close queue
        await closeQueue();

        // Close Redis connections
        await closeRedisConnections();

        // Close Prisma connection
        await closePrisma();

        logger.info('Server shut down gracefully');
        process.exit(0);
      } catch (error) {
        logger.error({ error: (error as Error).message }, 'Error during shutdown');
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
