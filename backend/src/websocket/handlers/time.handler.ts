import { Socket } from '../types/socket.js';
import { TimePingEvent, TimePingEventSchema, ServerEvents } from '../types/events.js';
import { logger } from '../../config/logger.js';

/**
 * Handle time:ping event
 *
 * Responds to client ping with both client time and server time
 * to enable clock synchronization
 */
export const handleTimePing = (socket: Socket, data: TimePingEvent): void => {
  try {
    // Validate input
    const validatedData = TimePingEventSchema.parse(data);

    // Get current server time
    const serverTime = Date.now();

    // Send pong response with both times
    socket.emit(ServerEvents.TIME_PONG, {
      clientTime: validatedData.clientTime,
      serverTime,
    });

    logger.debug(
      {
        socketId: socket.id,
        clientTime: validatedData.clientTime,
        serverTime,
      },
      'Time ping handled'
    );
  } catch (error) {
    logger.error(
      {
        error: (error as Error).message,
        stack: (error as Error).stack,
        socketId: socket.id,
      },
      'Error handling time:ping'
    );
  }
};
