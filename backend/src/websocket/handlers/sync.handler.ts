import { Namespace } from 'socket.io';
import {
  Socket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.js';
import {
  SyncPlayEvent,
  SyncPauseEvent,
  SyncSeekEvent,
  SyncRateEvent,
  SyncResyncEvent,
  SyncPlayEventSchema,
  SyncPauseEventSchema,
  SyncSeekEventSchema,
  SyncRateEventSchema,
  SyncResyncEventSchema,
  ErrorCodes,
  ServerEvents,
  SyncCommand,
  Room,
  RoomParticipant,
  PlaybackState,
} from '../types/events.js';
import { roomService } from '../../modules/room/room.service.js';
import { roomStateService } from '../../modules/room/state.service.js';
import { logger } from '../../config/logger.js';
import { stateRedis } from '../../config/redis.js';

type SyncNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX = 10; // Max 10 sync commands per second per user

/**
 * Check if participant can control playback
 */
function canControl(participant: RoomParticipant, room: Room): boolean {
  if (room.playbackControl === 'owner_only') {
    return participant.role === 'owner';
  }
  if (room.playbackControl === 'all') {
    return participant.role !== 'guest';
  }
  if (room.playbackControl === 'selected') {
    return participant.canControl || participant.role === 'owner';
  }
  return false;
}

/**
 * Check rate limit for sync commands
 */
async function checkRateLimit(roomId: string, oderId: string): Promise<boolean> {
  try {
    const key = `room:${roomId}:ratelimit:${oderId}`;
    const count = await stateRedis.incr(key);

    if (count === 1) {
      await stateRedis.pexpire(key, RATE_LIMIT_WINDOW);
    }

    return count <= RATE_LIMIT_MAX;
  } catch (error) {
    logger.error(
      { error: (error as Error).message, roomId, oderId },
      'Error checking rate limit'
    );
    return true; // Allow on error to avoid blocking legitimate requests
  }
}

/**
 * Validate that socket is in a room and get room info
 */
async function validateInRoom(
  socket: Socket
): Promise<{ room: Room; participant: RoomParticipant } | null> {
  if (!socket.data.roomCode || !socket.data.oderId) {
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.NOT_IN_ROOM,
      message: 'You are not in a room',
    });
    return null;
  }

  const dbRoom = await roomService.getRoomByCode(socket.data.roomCode);
  if (!dbRoom) {
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.ROOM_NOT_FOUND,
      message: 'Room not found',
    });
    return null;
  }

  const participants = await roomStateService.getParticipants(dbRoom.id);
  const participant = participants.find((p) => p.oderId === socket.data.oderId);

  if (!participant) {
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Participant not found in room',
    });
    return null;
  }

  // Convert to Room type
  const room: Room = {
    id: dbRoom.id,
    code: dbRoom.code,
    name: dbRoom.name,
    ownerId: dbRoom.ownerId,
    maxParticipants: dbRoom.maxParticipants,
    hasPassword: !!dbRoom.passwordHash,
    playbackControl: dbRoom.playbackControl as 'owner_only' | 'all' | 'selected',
    createdAt: dbRoom.createdAt.toISOString(),
    expiresAt: dbRoom.expiresAt.toISOString(),
  };

  return { room, participant };
}

/**
 * Handle sync:play event
 */
export const handleSyncPlay = async (
  socket: Socket,
  io: SyncNamespace,
  data: SyncPlayEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = SyncPlayEventSchema.parse(data);

    // Validate room membership
    const roomInfo = await validateInRoom(socket);
    if (!roomInfo) return;

    const { room, participant } = roomInfo;

    // Check permissions
    if (!canControl(participant, room)) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'You do not have permission to control playback',
      });
      return;
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(room.id, participant.oderId);
    if (!withinLimit) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    // Get current playback state
    const currentState = await roomStateService.getPlaybackState(room.id);
    if (!currentState) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'No playback state found',
      });
      return;
    }

    // Generate server time and sequence number
    const atServerTime = validatedData.atServerTime ?? Date.now();
    const sequenceNumber = await roomStateService.incrementSequenceNumber(room.id);

    // Update playback state
    const newState: PlaybackState = {
      ...currentState,
      isPlaying: true,
      anchorServerTimeMs: atServerTime,
      sequenceNumber,
    };

    await roomStateService.setPlaybackState(room.id, newState);

    // Create and broadcast command
    const command: SyncCommand = {
      type: 'PLAY',
      atServerTime,
      sequenceNumber,
    };

    io.to(room.code).emit(ServerEvents.SYNC_COMMAND, { command });

    logger.info(
      {
        roomId: room.id,
        oderId: participant.oderId,
        sequenceNumber,
        atServerTime,
      },
      'Play command broadcast'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling sync:play'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to process play command',
    });
  }
};

/**
 * Handle sync:pause event
 */
export const handleSyncPause = async (
  socket: Socket,
  io: SyncNamespace,
  data: SyncPauseEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = SyncPauseEventSchema.parse(data);

    // Validate room membership
    const roomInfo = await validateInRoom(socket);
    if (!roomInfo) return;

    const { room, participant } = roomInfo;

    // Check permissions
    if (!canControl(participant, room)) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'You do not have permission to control playback',
      });
      return;
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(room.id, participant.oderId);
    if (!withinLimit) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    // Get current playback state
    const currentState = await roomStateService.getPlaybackState(room.id);
    if (!currentState) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'No playback state found',
      });
      return;
    }

    // Generate server time and sequence number
    const atServerTime = validatedData.atServerTime ?? Date.now();
    const sequenceNumber = await roomStateService.incrementSequenceNumber(room.id);

    // Calculate current media time when pausing
    let currentMediaTime = currentState.anchorMediaTimeMs;
    if (currentState.isPlaying) {
      const timeSinceAnchor = atServerTime - currentState.anchorServerTimeMs;
      currentMediaTime += timeSinceAnchor * currentState.playbackRate;
    }

    // Update playback state
    const newState: PlaybackState = {
      ...currentState,
      isPlaying: false,
      anchorServerTimeMs: atServerTime,
      anchorMediaTimeMs: currentMediaTime,
      sequenceNumber,
    };

    await roomStateService.setPlaybackState(room.id, newState);

    // Create and broadcast command
    const command: SyncCommand = {
      type: 'PAUSE',
      atServerTime,
      sequenceNumber,
    };

    io.to(room.code).emit(ServerEvents.SYNC_COMMAND, { command });

    logger.info(
      {
        roomId: room.id,
        oderId: participant.oderId,
        sequenceNumber,
        atServerTime,
      },
      'Pause command broadcast'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling sync:pause'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to process pause command',
    });
  }
};

/**
 * Handle sync:seek event
 */
export const handleSyncSeek = async (
  socket: Socket,
  io: SyncNamespace,
  data: SyncSeekEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = SyncSeekEventSchema.parse(data);

    // Validate room membership
    const roomInfo = await validateInRoom(socket);
    if (!roomInfo) return;

    const { room, participant } = roomInfo;

    // Check permissions
    if (!canControl(participant, room)) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'You do not have permission to control playback',
      });
      return;
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(room.id, participant.oderId);
    if (!withinLimit) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    // Get current playback state
    const currentState = await roomStateService.getPlaybackState(room.id);
    if (!currentState) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'No playback state found',
      });
      return;
    }

    // Generate server time and sequence number
    const atServerTime = validatedData.atServerTime ?? Date.now();
    const sequenceNumber = await roomStateService.incrementSequenceNumber(room.id);

    // Update playback state
    const newState: PlaybackState = {
      ...currentState,
      anchorServerTimeMs: atServerTime,
      anchorMediaTimeMs: validatedData.targetMediaTime,
      sequenceNumber,
    };

    await roomStateService.setPlaybackState(room.id, newState);

    // Create and broadcast command
    const command: SyncCommand = {
      type: 'SEEK',
      targetMediaTime: validatedData.targetMediaTime,
      atServerTime,
      sequenceNumber,
    };

    io.to(room.code).emit(ServerEvents.SYNC_COMMAND, { command });

    logger.info(
      {
        roomId: room.id,
        oderId: participant.oderId,
        sequenceNumber,
        targetMediaTime: validatedData.targetMediaTime,
        atServerTime,
      },
      'Seek command broadcast'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling sync:seek'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to process seek command',
    });
  }
};

/**
 * Handle sync:rate event
 */
export const handleSyncRate = async (
  socket: Socket,
  io: SyncNamespace,
  data: SyncRateEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = SyncRateEventSchema.parse(data);

    // Validate room membership
    const roomInfo = await validateInRoom(socket);
    if (!roomInfo) return;

    const { room, participant } = roomInfo;

    // Check permissions
    if (!canControl(participant, room)) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'You do not have permission to control playback',
      });
      return;
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(room.id, participant.oderId);
    if (!withinLimit) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Rate limit exceeded. Please slow down.',
      });
      return;
    }

    // Get current playback state
    const currentState = await roomStateService.getPlaybackState(room.id);
    if (!currentState) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'No playback state found',
      });
      return;
    }

    // Generate server time and sequence number
    const atServerTime = validatedData.atServerTime ?? Date.now();
    const sequenceNumber = await roomStateService.incrementSequenceNumber(room.id);

    // Calculate current media time when changing rate
    let currentMediaTime = currentState.anchorMediaTimeMs;
    if (currentState.isPlaying) {
      const timeSinceAnchor = atServerTime - currentState.anchorServerTimeMs;
      currentMediaTime += timeSinceAnchor * currentState.playbackRate;
    }

    // Update playback state
    const newState: PlaybackState = {
      ...currentState,
      playbackRate: validatedData.rate,
      anchorServerTimeMs: atServerTime,
      anchorMediaTimeMs: currentMediaTime,
      sequenceNumber,
    };

    await roomStateService.setPlaybackState(room.id, newState);

    // Create and broadcast command
    const command: SyncCommand = {
      type: 'SET_RATE',
      rate: validatedData.rate,
      atServerTime,
      sequenceNumber,
    };

    io.to(room.code).emit(ServerEvents.SYNC_COMMAND, { command });

    logger.info(
      {
        roomId: room.id,
        oderId: participant.oderId,
        sequenceNumber,
        rate: validatedData.rate,
        atServerTime,
      },
      'Rate change command broadcast'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling sync:rate'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to process rate change command',
    });
  }
};

/**
 * Handle sync:resync event
 * Sends fresh playback state snapshot to requesting client
 */
export const handleSyncResync = async (
  socket: Socket,
  io: SyncNamespace,
  data: SyncResyncEvent
): Promise<void> => {
  try {
    // Validate input
    SyncResyncEventSchema.parse(data);

    // Validate room membership
    const roomInfo = await validateInRoom(socket);
    if (!roomInfo) return;

    const { room, participant } = roomInfo;

    // Get current playback state
    const currentState = await roomStateService.getPlaybackState(room.id);
    if (!currentState) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'No playback state found',
      });
      return;
    }

    // Send fresh state snapshot to requesting client only
    socket.emit(ServerEvents.SYNC_STATE, { state: currentState });

    logger.info(
      {
        roomId: room.id,
        oderId: participant.oderId,
        sequenceNumber: currentState.sequenceNumber,
      },
      'Manual resync state sent'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling sync:resync'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to process resync request',
    });
  }
};
