import { Socket } from '../types/socket.js';
import { ErrorCodes, ServerEvents } from '../types/events.js';
import { logger } from '../../config/logger.js';

/**
 * Error handler middleware for Socket.io
 * Catches errors and sends standardized error events to clients
 */
export const errorHandler = (socket: Socket, next: (err?: Error) => void) => {
  socket.on('error', (error: Error) => {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        socketId: socket.id,
        userId: socket.data.userId,
        sessionId: socket.data.sessionId,
      },
      'Socket error occurred'
    );

    // Send error event to client
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An internal error occurred',
    });
  });

  next();
};

/**
 * Wrapper for async event handlers
 * Catches errors and logs them
 */
export const asyncHandler =
  <T extends any[]>(
    handler: (socket: Socket, ...args: T) => Promise<void>
  ): ((socket: Socket, ...args: T) => void) =>
  (socket: Socket, ...args: T) => {
    handler(socket, ...args).catch((error: Error) => {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          socketId: socket.id,
          userId: socket.data.userId,
          sessionId: socket.data.sessionId,
        },
        'Async handler error'
      );

      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'An error occurred while processing your request',
      });
    });
  };
