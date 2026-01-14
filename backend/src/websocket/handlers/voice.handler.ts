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
  ErrorCodes,
  ServerEvents,
} from '../types/events.js';
import { getIceServers } from '../../services/turn.service.js';
import { logger } from '../../config/logger.js';

type SyncNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Get all sockets in voice chat for a room
 */
function getVoicePeersInRoom(io: SyncNamespace, roomCode: string): Socket[] {
  const sockets: Socket[] = [];
  const room = io.adapter.rooms.get(roomCode);
  if (!room) return sockets;

  for (const socketId of room) {
    const socket = io.sockets.get(socketId);
    if (socket && socket.data.isInVoice) {
      sockets.push(socket);
    }
  }
  return sockets;
}

/**
 * Handle voice:join event
 */
export const handleVoiceJoin = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceJoinEvent
): Promise<void> => {
  try {
    // Validate input
    VoiceJoinEventSchema.parse(data);

    // Check if in a room
    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.NOT_IN_ROOM,
        message: 'You must join a room first',
      });
      return;
    }

    // Check if already in voice
    if (socket.data.isInVoice) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.ALREADY_IN_VOICE,
        message: 'Already in voice chat',
      });
      return;
    }

    // Mark user as in voice
    socket.data.isInVoice = true;

    // Get current voice peers in the room
    const currentPeers = getVoicePeersInRoom(io, socket.data.roomCode);
    const peerIds = currentPeers
      .filter((s) => s.id !== socket.id)
      .map((s) => s.data.oderId!)
      .filter(Boolean);

    // Generate ICE servers with TURN credentials
    const userId = socket.data.userId || socket.data.sessionId;
    const iceServers = getIceServers(userId);

    // Send ICE servers to the joining user
    socket.emit(ServerEvents.VOICE_ICE_SERVERS, { iceServers });

    // Send current peers list to the joining user
    socket.emit(ServerEvents.VOICE_PEERS, { peers: peerIds });

    // Notify others in the room that a new peer joined voice
    socket.to(socket.data.roomCode).emit(ServerEvents.VOICE_PEER_JOINED, {
      oderId: socket.data.oderId,
    });

    logger.info(
      {
        userId: socket.data.userId,
        oderId: socket.data.oderId,
        roomCode: socket.data.roomCode,
        peerCount: peerIds.length,
      },
      'User joined voice chat'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:join'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to join voice chat',
    });
  }
};

/**
 * Handle voice:leave event
 */
export const handleVoiceLeave = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceLeaveEvent
): Promise<void> => {
  try {
    // Validate input
    VoiceLeaveEventSchema.parse(data);

    // Check if in voice
    if (!socket.data.isInVoice) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.NOT_IN_VOICE,
        message: 'You are not in voice chat',
      });
      return;
    }

    // Mark user as not in voice
    socket.data.isInVoice = false;

    // Notify others in the room
    if (socket.data.roomCode && socket.data.oderId) {
      socket.to(socket.data.roomCode).emit(ServerEvents.VOICE_PEER_LEFT, {
        oderId: socket.data.oderId,
      });
    }

    logger.info(
      {
        userId: socket.data.userId,
        oderId: socket.data.oderId,
        roomCode: socket.data.roomCode,
      },
      'User left voice chat'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:leave'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to leave voice chat',
    });
  }
};

/**
 * Handle voice:signal event (WebRTC signaling relay)
 */
export const handleVoiceSignal = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceSignalEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = VoiceSignalEventSchema.parse(data);

    // Check if in voice
    if (!socket.data.isInVoice || !socket.data.oderId) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.NOT_IN_VOICE,
        message: 'You are not in voice chat',
      });
      return;
    }

    // Check if in a room
    if (!socket.data.roomCode) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.NOT_IN_ROOM,
        message: 'You must join a room first',
      });
      return;
    }

    // Find target peer socket
    const room = io.adapter.rooms.get(socket.data.roomCode);
    if (!room) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.ROOM_NOT_FOUND,
        message: 'Room not found',
      });
      return;
    }

    let targetSocket: Socket | undefined;
    for (const socketId of room) {
      const s = io.sockets.get(socketId);
      if (s && s.data.oderId === validatedData.targetId) {
        targetSocket = s;
        break;
      }
    }

    if (!targetSocket) {
      socket.emit(ServerEvents.ROOM_ERROR, {
        code: ErrorCodes.VOICE_PEER_NOT_FOUND,
        message: 'Target peer not found',
      });
      return;
    }

    // Relay signal to target peer
    targetSocket.emit(ServerEvents.VOICE_SIGNAL, {
      fromId: socket.data.oderId,
      signal: validatedData.signal,
    });

    logger.debug(
      {
        fromId: socket.data.oderId,
        targetId: validatedData.targetId,
        roomCode: socket.data.roomCode,
      },
      'Voice signal relayed'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:signal'
    );
    socket.emit(ServerEvents.ROOM_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to relay signal',
    });
  }
};

/**
 * Handle voice:speaking event
 */
export const handleVoiceSpeaking = async (
  socket: Socket,
  io: SyncNamespace,
  data: VoiceSpeakingEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = VoiceSpeakingEventSchema.parse(data);

    // Check if in voice
    if (!socket.data.isInVoice || !socket.data.oderId) {
      return; // Silently ignore if not in voice
    }

    // Check if in a room
    if (!socket.data.roomCode) {
      return; // Silently ignore if not in room
    }

    // Broadcast speaking status to others in the room
    socket.to(socket.data.roomCode).emit(ServerEvents.VOICE_SPEAKING, {
      oderId: socket.data.oderId,
      isSpeaking: validatedData.isSpeaking,
    });

    logger.debug(
      {
        userId: socket.data.userId,
        oderId: socket.data.oderId,
        isSpeaking: validatedData.isSpeaking,
      },
      'Voice speaking status updated'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling voice:speaking'
    );
    // Don't emit error for speaking events - they're frequent and non-critical
  }
};

/**
 * Handle voice cleanup on disconnect
 */
export const handleVoiceDisconnect = (socket: Socket, io: SyncNamespace): void => {
  if (socket.data.isInVoice && socket.data.roomCode && socket.data.oderId) {
    // Notify others that peer left voice
    socket.to(socket.data.roomCode).emit(ServerEvents.VOICE_PEER_LEFT, {
      oderId: socket.data.oderId,
    });

    logger.info(
      {
        userId: socket.data.userId,
        oderId: socket.data.oderId,
        roomCode: socket.data.roomCode,
      },
      'User disconnected from voice chat'
    );
  }
};
