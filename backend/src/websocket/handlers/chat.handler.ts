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
  ChatTypingEvent,
  ChatTypingEventSchema,
  ChatLoadHistoryEvent,
  ChatLoadHistoryEventSchema,
  ErrorCodes,
  ServerEvents,
  ChatMessage,
  ChatTypingStatusEvent,
} from '../types/events.js';
import { chatService } from '../../modules/chat/index.js';
import { roomService } from '../../modules/room/room.service.js';
import { moderationService } from '../../modules/moderation/index.js';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { checkRateLimit } from '../middleware/rate-limit.js';
import * as analyticsTracker from '../analytics-tracker.js';

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

    // Check if user is muted
    const isMuted = await moderationService.isMuted(room.id, participant.userId, 'chat');
    if (isMuted) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.FORBIDDEN,
        message: 'You are temporarily muted and cannot send messages',
      });
      return;
    }

    // Check auto-moderation rules
    const autoModResult = await moderationService.checkAutoModeration(
      room.id,
      participant.userId,
      validatedData.content
    );

    if (!autoModResult.allowed) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.FORBIDDEN,
        message: autoModResult.reason || 'Message blocked by auto-moderation',
      });

      // Log the auto-mod action
      logger.info({
        userId: participant.userId,
        roomId: room.id,
        action: autoModResult.action,
        reason: autoModResult.reason,
      }, 'Auto-moderation action taken');

      return;
    }

    // Check if user is shadow muted
    const isShadowMuted = await moderationService.isShadowMuted(room.id, participant.userId);

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

    if (isShadowMuted) {
      // Only send to the sender (shadow muted)
      socket.emit(ServerEvents.CHAT_MESSAGE, chatMessage);
      logger.debug({
        userId: participant.userId,
        roomId: room.id,
      }, 'Shadow muted message sent only to sender');
    } else {
      // Broadcast to all participants in the room (including sender)
      io.to(roomCode).emit(ServerEvents.CHAT_MESSAGE, chatMessage);
    }

    // Track analytics event (async, don't await)
    analyticsTracker.trackChatMessage(socket, room.id, validatedData.content.length).catch(err =>
      logger.error({ error: err }, 'Failed to track chat message event')
    );

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

/**
 * Handle chat:typing event
 */
export const handleChatTyping = async (
  socket: Socket,
  io: SyncNamespace,
  data: ChatTypingEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = ChatTypingEventSchema.parse(data);

    // Check if user is in a room
    if (!socket.data.roomCode || !socket.data.oderId) {
      return; // Silently ignore - typing indicators are not critical
    }

    // Block guests from sending typing indicators
    if (socket.data.isGuest) {
      return; // Silently ignore
    }

    const userId = socket.data.userId!;
    const roomCode = socket.data.roomCode;

    // Get user info from database
    const room = await roomService.getRoomByCode(roomCode);
    if (!room) {
      return;
    }

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
          },
        },
      },
    });

    if (!participant || !participant.user) {
      return;
    }

    // Broadcast typing status to all other participants in the room
    const typingStatus: ChatTypingStatusEvent = {
      userId,
      username: participant.user.username,
      isTyping: validatedData.isTyping,
    };

    socket.to(roomCode).emit(ServerEvents.CHAT_TYPING, typingStatus);

    logger.debug(
      {
        roomCode,
        userId,
        isTyping: validatedData.isTyping,
      },
      'Typing indicator broadcast'
    );
  } catch (error) {
    // Silently ignore typing indicator errors - they are not critical
    logger.debug({ error: (error as Error).message }, 'Error handling chat:typing');
  }
};

/**
 * Handle chat:load-history event
 */
export const handleChatLoadHistory = async (
  socket: Socket,
  io: SyncNamespace,
  data: ChatLoadHistoryEvent
): Promise<void> => {
  try {
    // Validate input
    const validatedData = ChatLoadHistoryEventSchema.parse(data);

    // Check if user is in a room
    if (!socket.data.roomCode || !socket.data.oderId) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.NOT_IN_ROOM,
        message: 'You must be in a room to load chat history',
      });
      return;
    }

    const roomCode = socket.data.roomCode;

    // Get room
    const room = await roomService.getRoomByCode(roomCode);
    if (!room) {
      socket.emit(ServerEvents.CHAT_ERROR, {
        code: ErrorCodes.ROOM_NOT_FOUND,
        message: 'Room not found',
      });
      return;
    }

    // Load chat history with pagination
    const limit = validatedData.limit || 50;
    const before = validatedData.before ? new Date(validatedData.before) : undefined;

    const messages = await chatService.getChatHistoryPaginated(room.id, limit, before);

    // Check if there are more messages available
    const hasMore = messages.length === limit;

    socket.emit(ServerEvents.CHAT_HISTORY, {
      messages,
      hasMore,
    });

    logger.debug(
      {
        roomId: room.id,
        messageCount: messages.length,
        before: validatedData.before,
        hasMore,
      },
      'Paginated chat history sent'
    );
  } catch (error) {
    logger.error(
      { error: (error as Error).message, stack: (error as Error).stack },
      'Error handling chat:load-history'
    );
    socket.emit(ServerEvents.CHAT_ERROR, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Failed to load chat history',
    });
  }
};
