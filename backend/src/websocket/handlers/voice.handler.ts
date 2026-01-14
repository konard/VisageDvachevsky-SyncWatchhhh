import { Namespace } from 'socket.io';
import {
  Socket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.js';
import {
  VoiceJoinEvent,
  VoiceJoinEventSchema,
  VoiceLeaveEvent,
  VoiceLeaveEventSchema,
  VoiceSignalEvent,
  VoiceSignalEventSchema,
  VoiceSpeakingEvent,
  VoiceSpeakingEventSchema,
  VoiceErrorCodes,
} from '../types/events.js';
import { voiceStateService } from '../../modules/voice/state.service.js';
import { roomService } from '../../modules/room/room.service.js';
import { logger } from '../../config/logger.js';

type SyncNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Handle voice:join event
 * User joins voice chat in their current room
 */
export const handleVoiceJoin = async (
  socket: Socket,
  _io: SyncNamespace,
  data: VoiceJoinEvent
): Promise<void> => {
  try {
    // Validate input
    VoiceJoinEventSchema.parse(data);

    // Check if user is in a room
    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'You must be in a room to join voice chat',
      });
      return;
    }

    // Check if already in voice
    if (socket.data.inVoice) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.ALREADY_IN_VOICE,
        message: 'You are already in voice chat',
      });
      return;
    }

    // Get room from database
    const room = await roomService.getRoomByCode(socket.data.roomCode);
    if (!room) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'Room not found',
      });
      return;
    }

    // Add to voice state in Redis
    await voiceStateService.addVoiceParticipant(room.id, socket.data.oderId);

    // Update socket data
    socket.data.inVoice = true;

    // Get all existing voice participants (excluding the new joiner)
    const allPeers = await voiceStateService.getVoicePeerIds(room.id);
    const existingPeers = allPeers.filter((peerId) => peerId !== socket.data.oderId);

    // Send list of existing peers to the joining user
    socket.emit('voice:peers', {
      peers: existingPeers,
    });

    // Notify others in the room that a new peer joined
    socket.to(socket.data.roomCode).emit('voice:peer:joined', {
      oderId: socket.data.oderId,
    });

    logger.info(
      {
        userId: socket.data.userId,
        guestName: socket.data.guestName,
        roomCode: socket.data.roomCode,
        oderId: socket.data.oderId,
      },
      'User joined voice chat'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:join'
    );
    socket.emit('voice:error', {
      code: VoiceErrorCodes.INTERNAL_ERROR,
      message: 'Failed to join voice chat',
    });
  }
};

/**
 * Handle voice:leave event
 * User leaves voice chat
 */
export const handleVoiceLeave = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceLeaveEvent
): Promise<void> => {
  try {
    // Validate input
    VoiceLeaveEventSchema.parse(data);

    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'You are not in a room',
      });
      return;
    }

    if (!socket.data.inVoice) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_VOICE,
        message: 'You are not in voice chat',
      });
      return;
    }

    await leaveVoice(socket, io);

    logger.info(
      {
        userId: socket.data.userId,
        guestName: socket.data.guestName,
        roomCode: socket.data.roomCode,
        oderId: socket.data.oderId,
      },
      'User left voice chat'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:leave'
    );
    socket.emit('voice:error', {
      code: VoiceErrorCodes.INTERNAL_ERROR,
      message: 'Failed to leave voice chat',
    });
  }
};

/**
 * Handle voice:signal event
 * Relay WebRTC signaling data (SDP offer/answer or ICE candidates) between peers
 */
export const handleVoiceSignal = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceSignalEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = VoiceSignalEventSchema.parse(data);

    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'You are not in a room',
      });
      return;
    }

    if (!socket.data.inVoice) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_VOICE,
        message: 'You are not in voice chat',
      });
      return;
    }

    // Get room from database
    const room = await roomService.getRoomByCode(socket.data.roomCode);
    if (!room) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'Room not found',
      });
      return;
    }

    // Verify target peer is in voice chat
    const isTargetInVoice = await voiceStateService.isInVoice(room.id, validatedData.targetId);
    if (!isTargetInVoice) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.PEER_NOT_FOUND,
        message: 'Target peer is not in voice chat',
      });
      return;
    }

    // Find the target socket by oderId
    const roomSockets = await io.in(socket.data.roomCode).fetchSockets();
    const targetSocket = roomSockets.find((s: any) => s.data.oderId === validatedData.targetId);

    if (!targetSocket) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.PEER_NOT_FOUND,
        message: 'Target peer socket not found',
      });
      return;
    }

    // Relay the signal to the target peer
    targetSocket.emit('voice:signal', {
      fromId: socket.data.oderId,
      signal: validatedData.signal,
    });

    logger.debug(
      {
        fromId: socket.data.oderId,
        targetId: validatedData.targetId,
        signalType: validatedData.signal.type,
        roomCode: socket.data.roomCode,
      },
      'Voice signal relayed'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:signal'
    );
    socket.emit('voice:error', {
      code: VoiceErrorCodes.INTERNAL_ERROR,
      message: 'Failed to relay signal',
    });
  }
};

/**
 * Handle voice:speaking event
 * Update and broadcast speaking status
 */
export const handleVoiceSpeaking = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceSpeakingEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = VoiceSpeakingEventSchema.parse(data);

    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'You are not in a room',
      });
      return;
    }

    if (!socket.data.inVoice) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_VOICE,
        message: 'You are not in voice chat',
      });
      return;
    }

    // Get room from database
    const room = await roomService.getRoomByCode(socket.data.roomCode);
    if (!room) {
      socket.emit('voice:error', {
        code: VoiceErrorCodes.NOT_IN_ROOM,
        message: 'Room not found',
      });
      return;
    }

    // Update speaking status in Redis
    await voiceStateService.updateSpeakingStatus(
      room.id,
      socket.data.oderId,
      validatedData.isSpeaking
    );

    // Broadcast speaking status to all users in the room (including sender)
    io.to(socket.data.roomCode).emit('voice:speaking', {
      oderId: socket.data.oderId,
      isSpeaking: validatedData.isSpeaking,
    });

    logger.debug(
      {
        oderId: socket.data.oderId,
        isSpeaking: validatedData.isSpeaking,
        roomCode: socket.data.roomCode,
      },
      'Speaking status updated'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:speaking'
    );
    socket.emit('voice:error', {
      code: VoiceErrorCodes.INTERNAL_ERROR,
      message: 'Failed to update speaking status',
    });
  }
};

/**
 * Handle voice cleanup on disconnect or room leave
 * Called from room handler when user disconnects or leaves room
 */
export const handleVoiceCleanup = async (socket: Socket, io: SyncNamespace): Promise<void> => {
  try {
    if (socket.data.inVoice && socket.data.roomCode && socket.data.oderId) {
      await leaveVoice(socket, io);
    }
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error during voice cleanup'
    );
  }
};

/**
 * Helper function to handle leaving voice chat
 */
async function leaveVoice(socket: Socket, io: SyncNamespace): Promise<void> {
  const { roomCode, oderId } = socket.data;

  if (!roomCode || !oderId) {
    return;
  }

  // Get room
  const room = await roomService.getRoomByCode(roomCode);
  if (!room) {
    return;
  }

  // Remove from voice state
  await voiceStateService.removeVoiceParticipant(room.id, oderId);

  // Update socket data
  socket.data.inVoice = false;

  // Notify others in the room
  io.to(roomCode).emit('voice:peer:left', {
    oderId,
  });
}
