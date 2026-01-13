import { Socket } from '../types/socket.js';
import { logger } from '../../config/logger.js';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

/**
 * Authentication middleware for Socket.io
 * Supports both authenticated (JWT) and guest connections
 */
export const authMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Extract token from auth header or handshake
    const token = socket.handshake.auth.token as string | undefined;

    // Generate unique session ID for this connection
    const sessionId = nanoid();
    socket.data.sessionId = sessionId;

    if (token) {
      // Authenticated user
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

        socket.data.userId = payload.userId;
        socket.data.isGuest = false;

        logger.info(
          { userId: payload.userId, sessionId, socketId: socket.id },
          'Authenticated user connected'
        );
      } catch (err) {
        // Invalid token - treat as guest
        logger.warn(
          { error: (err as Error).message, sessionId, socketId: socket.id },
          'Invalid JWT token, treating as guest'
        );
        socket.data.isGuest = true;
      }
    } else {
      // Guest user
      socket.data.isGuest = true;

      logger.info({ sessionId, socketId: socket.id }, 'Guest user connected');
    }

    next();
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Auth middleware error');
    next(error as Error);
  }
};
