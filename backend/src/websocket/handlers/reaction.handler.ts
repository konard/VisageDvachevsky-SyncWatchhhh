/**
 * Reaction WebSocket Handlers
 * Handles video reactions with timeline attachment
 */

import { Namespace } from 'socket.io';
import { Socket } from '../types/socket.js';
import { ReactionSendEventSchema } from '../types/events.js';
import { ReactionsService } from '../../modules/reactions/service.js';
import { logger } from '../../config/logger.js';
import { ZodError } from 'zod';

const reactionsService = new ReactionsService();

/**
 * Handle sending a reaction
 */
export async function handleReactionSend(
  socket: Socket,
  namespace: Namespace,
  data: unknown
): Promise<void> {
  try {
    // User must be in a room
    if (!socket.data.roomCode) {
      logger.warn({ socketId: socket.id }, 'User tried to send reaction without being in a room');
      return;
    }

    // Validate input
    const { emoji, mediaTimeMs, animation } = ReactionSendEventSchema.parse(data);

    // Get room ID from code
    const roomId = socket.data.roomCode; // In real implementation, need to get actual roomId

    // Create reaction
    const reaction = await reactionsService.createReaction(
      socket.data.userId,
      socket.data.guestName,
      {
        roomId,
        emoji,
        mediaTimeMs,
        animation,
      }
    );

    // Broadcast to all participants in the room
    namespace.to(socket.data.roomCode).emit('reaction:new', reaction);

    logger.info(
      {
        socketId: socket.id,
        userId: socket.data.userId,
        roomCode: socket.data.roomCode,
        emoji,
        mediaTimeMs,
      },
      'Reaction sent'
    );
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ socketId: socket.id, error: error.errors }, 'Invalid reaction data');
    } else if (error instanceof Error && error.message.includes('rate limit')) {
      logger.warn({ socketId: socket.id }, 'Reaction rate limit exceeded');
      socket.emit('room:error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'You are sending reactions too fast. Please slow down.',
      });
    } else {
      logger.error({ socketId: socket.id, error }, 'Error sending reaction');
    }
  }
}

/**
 * Send timeline reactions on room join
 */
export async function sendTimelineReactions(
  socket: Socket,
  roomId: string
): Promise<void> {
  try {
    const timelineReactions = await reactionsService.getTimelineReactions(roomId);

    // Convert Map to plain object for JSON serialization
    const reactionsData = timelineReactions.map(tr => ({
      mediaTimeMs: tr.mediaTimeMs,
      reactions: Object.fromEntries(tr.reactions),
    }));

    socket.emit('reaction:timeline', {
      reactions: reactionsData,
    });

    logger.info(
      {
        socketId: socket.id,
        roomId,
        reactionsCount: timelineReactions.length,
      },
      'Timeline reactions sent'
    );
  } catch (error) {
    logger.error({ socketId: socket.id, roomId, error }, 'Error sending timeline reactions');
  }
}
