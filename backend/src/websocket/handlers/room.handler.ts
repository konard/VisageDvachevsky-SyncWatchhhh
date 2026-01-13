import { Namespace } from 'socket.io';
import {
  Socket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.js';
import {
  RoomJoinEvent,
  RoomJoinEventSchema,
  RoomLeaveEvent,
  RoomLeaveEventSchema,
  ErrorCodes,
  ServerEvents,
  RoomParticipant,
  Room,
} from '../types/events.js';
import { roomService } from '../../modules/room/room.service.js';
import { roomStateService } from '../../modules/room/state.service.js';
import { logger } from '../../config/logger.js';
import { nanoid } from 'nanoid';

type SyncNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Handle room:join event
 */
export const handleRoomJoin = async (
  socket: Socket,
  _io: SyncNamespace,
  data: RoomJoinEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = RoomJoinEventSchema.parse(data);

    // Check if already in a room
    if (socket.data.roomCode) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.ALREADY_IN_ROOM,
        message: 'You are already in a room. Leave first.',
      });
      return;
    }

    // Get room from database
    const room = await roomService.getRoomByCode(validatedData.roomCode);

    if (!room) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.ROOM_NOT_FOUND,
        message: 'Room not found',
      });
      return;
    }

    // Check if room is expired
    if (new Date() > room.expiresAt) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.ROOM_NOT_FOUND,
        message: 'Room has expired',
      });
      return;
    }

    // Verify password if required
    if (room.passwordHash && !validatedData.password) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.INVALID_PASSWORD,
        message: 'Password required',
      });
      return;
    }

    if (room.passwordHash && validatedData.password) {
      const isValidPassword = await roomService.verifyPassword(room, validatedData.password);
      if (!isValidPassword) {
        socket.emit(ServerEvents.ROOM_ERROR, {
          code: ErrorCodes.INVALID_PASSWORD,
          message: 'Invalid password',
        });
        return;
      }
    }

    // Check room capacity
    const currentParticipants = await roomStateService.getParticipants(room.id);
    if (currentParticipants.length >= room.maxParticipants) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.ROOM_FULL,
        message: 'Room is full',
      });
      return;
    }

    // Determine participant role
    const isOwner = socket.data.userId === room.ownerId;
    const role = isOwner ? 'owner' : socket.data.isGuest ? 'guest' : 'participant';

    // Validate guest name if guest
    if (socket.data.isGuest && !validatedData.guestName) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Guest name is required',
      });
      return;
    }

    // Generate oderId (unique order ID for participant)
    const oderId = nanoid(10);

    // Create participant in database
    const dbParticipant = await roomService.createParticipant({
      roomId: room.id,
      oderId,
      userId: socket.data.userId,
      guestName: validatedData.guestName,
      role,
      canControl: role === 'owner' || room.playbackControl === 'all',
    });

    // Create participant object for state
    const participant: RoomParticipant = {
      id: dbParticipant.id,
      oderId,
      userId: socket.data.userId,
      guestName: validatedData.guestName,
      role,
      canControl: dbParticipant.canControl,
      joinedAt: dbParticipant.joinedAt.toISOString(),
    };

    // Update socket data
    socket.data.roomCode = room.code;
    socket.data.oderId = oderId;

    if (socket.data.isGuest) {
      socket.data.guestName = validatedData.guestName;
    }

    // Join Socket.io room
    await socket.join(room.code);

    // Add to Redis state
    await roomStateService.addParticipant(room.id, participant);
    await roomStateService.addOnlineSocket(room.id, socket.id);

    // Get current state
    const playbackState = await roomStateService.getPlaybackState(room.id);
    const allParticipants = await roomStateService.getParticipants(room.id);

    // Send room state to the joining user
    const roomData: Room = {
      id: room.id,
      code: room.code,
      name: room.name,
      ownerId: room.ownerId,
      maxParticipants: room.maxParticipants,
      hasPassword: !!room.passwordHash,
      playbackControl: room.playbackControl as 'owner_only' | 'all' | 'selected',
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
    };

    socket.emit(ServerEvents.ROOM_STATE, {
      room: roomData,
      participants: allParticipants,
      playback: playbackState,
    });

    // Notify others in the room
    socket.to(room.code).emit(ServerEvents.ROOM_PARTICIPANT_JOINED, {
      participant,
    });

    logger.info(
      {
        userId: socket.data.userId,
        guestName: socket.data.guestName,
        roomCode: room.code,
        oderId,
      },
      'User joined room'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling room:join'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to join room',
    });
  }
};

/**
 * Handle room:leave event
 */
export const handleRoomLeave = async (
  socket: Socket,
  io: SyncNamespace,
  data: RoomLeaveEvent
): Promise<void> => {
  try {
    // Validate input
    RoomLeaveEventSchema.parse(data);

    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.NOT_IN_ROOM,
        message: 'You are not in a room',
      });
      return;
    }

    await leaveRoom(socket, io);

    logger.info(
      {
        userId: socket.data.userId,
        guestName: socket.data.guestName,
        roomCode: socket.data.roomCode,
        oderId: socket.data.oderId,
      },
      'User left room'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling room:leave'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to leave room',
    });
  }
};

/**
 * Handle socket disconnect
 */
export const handleDisconnect = async (socket: Socket, io: SyncNamespace): Promise<void> => {
  try {
    if (socket.data.roomCode) {
      await leaveRoom(socket, io);
    }

    logger.info(
      {
        userId: socket.data.userId,
        sessionId: socket.data.sessionId,
      },
      'User disconnected'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling disconnect'
    );
  }
};

/**
 * Helper function to handle leaving a room
 */
async function leaveRoom(socket: Socket, io: SyncNamespace): Promise<void> {
  const { roomCode, oderId } = socket.data;

  if (!roomCode || !oderId) {
    return;
  }

  // Get room
  const room = await roomService.getRoomByCode(roomCode);
  if (!room) {
    return;
  }

  // Remove from Socket.io room
  await socket.leave(roomCode);

  // Remove from Redis state
  await roomStateService.removeParticipant(room.id, oderId);
  await roomStateService.removeOnlineSocket(room.id, socket.id);

  // Get participant from database
  const participant = await roomService.getParticipantByOderId(room.id, oderId);
  if (participant) {
    // Remove from database
    await roomService.removeParticipant(participant.id);
  }

  // Notify others in the room
  io.to(roomCode).emit(ServerEvents.ROOM_PARTICIPANT_LEFT, {
    oderId,
  });

  // Clear socket data
  socket.data.roomCode = undefined;
  socket.data.oderId = undefined;
}
