/**
 * Presence WebSocket Handlers
 * Handles real-time presence updates and friend presence
 */

import { Namespace } from 'socket.io';
import { Socket } from '../types/socket.js';
import { PresenceUpdateEventSchema } from '../types/events.js';
import { PresenceService } from '../../modules/presence/service.js';
import { logger } from '../../config/logger.js';
import { ZodError } from 'zod';

const presenceService = new PresenceService();

/**
 * Handle presence status update
 */
export async function handlePresenceUpdate(
  socket: Socket,
  namespace: Namespace,
  data: unknown
): Promise<void> {
  try {
    // Only authenticated users can update presence
    if (!socket.data.userId) {
      logger.warn({ socketId: socket.id }, 'Guest tried to update presence');
      return;
    }

    // Validate input
    const { status } = PresenceUpdateEventSchema.parse(data);

    // Update presence
    await presenceService.updatePresence(socket.data.userId, status);

    logger.info(
      {
        socketId: socket.id,
        userId: socket.data.userId,
        status,
      },
      'User presence updated'
    );
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ socketId: socket.id, error: error.errors }, 'Invalid presence update data');
    } else {
      logger.error({ socketId: socket.id, error }, 'Error updating presence');
    }
  }
}

/**
 * Subscribe to friend presence updates (called on connection)
 */
export async function subscribeFriendPresence(socket: Socket): Promise<void> {
  if (!socket.data.userId) {
    return;
  }

  try {
    const presences = await presenceService.getFriendsInRooms(socket.data.userId);

    // Send initial friends presence
    socket.emit('presence:friends', {
      presences: presences.map(friend => ({
        userId: friend.friendId,
        status: 'online' as const,
        lastSeenAt: Date.now(),
        currentRoomId: friend.roomId,
        currentActivity: friend.activity,
      })),
    });

    logger.info(
      {
        socketId: socket.id,
        userId: socket.data.userId,
        friendsCount: presences.length,
      },
      'Subscribed to friend presence updates'
    );
  } catch (error) {
    logger.error({ socketId: socket.id, error }, 'Error subscribing to friend presence');
  }
}
