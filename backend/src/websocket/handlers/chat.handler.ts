import { Namespace } from 'socket.io';
import {
  Socket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.js';
import {
  ChatMessageEvent,
  ChatMessageEventSchema,
  ErrorCodes,
  ServerEvents,
  ChatMessage,
} from '../types/events.js';
import { chatService } from '../../modules/chat/index.js';
import { roomService } from '../../modules/room/room.service.js';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { checkRateLimit } from '../middleware/rate-limit.js';

type SyncNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Handle chat:message event
 */
export const handleChatMessage = async (
  socket: Socket,
  io: SyncNamespace,
  data: ChatMessageEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = ChatMessageEventSchema.parse(data);

    // Check if user is in a room
    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.NOT_IN_ROOM,
        message: 'You must be in a room to send messages',
      });
      return;
    }

    // Block guests from sending messages
    if (socket.data.isGuest) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.GUEST_CANNOT_CHAT,
        message: 'Guests cannot send chat messages',
      });
      return;
    }

    // Check rate limit
    const userId = socket.data.userId!;
    const roomCode = socket.data.roomCode;

    const isRateLimited = await checkRateLimit(userId, roomCode);
    if (isRateLimited) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'You are sending messages too quickly. Please slow down.',
      });
      return;
    }

    // Get room
    const room = await roomService.getRoomByCode(roomCode);
    if (!room) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.ROOM_NOT_FOUND,
        message: 'Room not found',
      });
      return;
    }

    // Get user info from database with user details
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_oderId: {
          roomId: room.id,
          oderId: socket.data.oderId,
        },
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!participant || !participant.userId) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Participant not found',
      });
      return;
    }

    // Create message in database
    const dbMessage = await chatService.createUserMessage({
      roomId: room.id,
      userId: participant.userId,
      content: validatedData.content,
    });

    // Create chat message event
    const chatMessage: ChatMessage = {
      id: dbMessage.id,
      type: 'user',
      userId: participant.userId,
      username: participant.user?.username,
      avatarUrl: participant.user?.avatarUrl || undefined,
      content: validatedData.content,
      timestamp: dbMessage.createdAt.getTime(),
    };

    // Broadcast to all participants in the room (including sender)
    io.to(roomCode).emit(ServerEvents.CHAT_MESSAGE, chatMessage);

    logger.debug(
      {
        messageId: dbMessage.id,
        roomCode,
        userId: participant.userId,
      },
      'Chat message sent'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling chat:message'
    );
    socket.emit(ServerEvents.CHAT_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to send message',
    });
  }
};

/**
 * Send chat history to a user (called when joining a room)
 */
export const sendChatHistory = async (socket: Socket, roomId: string): Promise<void> => {
  try {
    const messages = await chatService.getChatHistory(roomId);

    socket.emit(ServerEvents.CHAT_HISTORY, {
      messages,
    });

    logger.debug({ roomId, messageCount: messages.length }, 'Chat history sent');
  } catch (error) {
    logger.error({ error: (error as Error).message, roomId }, 'Error sending chat history');
    socket.emit(ServerEvents.CHAT_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to load chat history',
    });
  }
};

/**
 * Broadcast system message to room
 */
export const broadcastSystemMessage = async (
  io: SyncNamespace,
  roomCode: string,
  roomId: string,
  event: ChatMessage['event']
): Promise<void> => {
  try {
    if (!event) return;

    // Create system message in database
    const dbMessage = await chatService.createSystemMessage({
      roomId,
      event,
    });

    // Create chat message event
    const chatMessage: ChatMessage = {
      id: dbMessage.id,
      type: 'system',
      event,
      timestamp: dbMessage.createdAt.getTime(),
    };

    // Broadcast to all participants in the room
    io.to(roomCode).emit(ServerEvents.CHAT_MESSAGE, chatMessage);

    logger.debug({ roomCode, event }, 'System message broadcast');
  } catch (error) {
    logger.error({ error: (error as Error).message, roomCode, event }, 'Error broadcasting system message');
    // Don't throw - this is a background operation
  }
};
