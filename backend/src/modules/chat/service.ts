import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  userId?: string;
  username?: string;
  avatarUrl?: string;
  content?: string;
  event?: SystemEvent;
  timestamp: number;
}

export type SystemEvent =
  | { kind: 'join'; username: string }
  | { kind: 'leave'; username: string }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'seek'; position: number };

/**
 * Chat Service
 * Handles database operations for chat messages
 */
export class ChatService {
  private readonly MAX_MESSAGES_PER_ROOM = 1000;
  private readonly HISTORY_LIMIT = 100;

  /**
   * Create a user message
   */
  async createUserMessage(data: {
    roomId: string;
    userId: string;
    content: string;
  }) {
    try {
      // Create message
      const message = await prisma.chatMessage.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          type: 'user',
          content: data.content,
        },
      });

      // Trigger cleanup in background (don't await)
      this.cleanupOldMessages(data.roomId).catch((err) => {
        logger.error({ error: err.message, roomId: data.roomId }, 'Failed to cleanup old messages');
      });

      logger.debug({ messageId: message.id, roomId: data.roomId }, 'User message created');

      return message;
    } catch (error) {
      logger.error({ error: (error as Error).message, data }, 'Failed to create user message');
      throw error;
    }
  }

  /**
   * Create a system message
   */
  async createSystemMessage(data: {
    roomId: string;
    event: SystemEvent;
  }) {
    try {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: data.roomId,
          type: 'system',
          content: '', // System messages use metadata
          metadata: data.event as object,
        },
      });

      logger.debug({ messageId: message.id, roomId: data.roomId, event: data.event }, 'System message created');

      return message;
    } catch (error) {
      logger.error({ error: (error as Error).message, data }, 'Failed to create system message');
      throw error;
    }
  }

  /**
   * Get chat history (last N messages)
   */
  async getChatHistory(roomId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: limit || this.HISTORY_LIMIT,
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Reverse to get chronological order (oldest first)
      const chronologicalMessages = messages.reverse();

      return chronologicalMessages.map((msg: {
        id: string;
        type: string;
        userId: string | null;
        content: string;
        metadata: unknown;
        createdAt: Date;
        user: { username: string; avatarUrl: string | null } | null;
      }) => this.toChatMessage(msg));
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get chat history');
      throw error;
    }
  }

  /**
   * Delete all messages for a room
   */
  async deleteRoomMessages(roomId: string): Promise<void> {
    try {
      await prisma.chatMessage.deleteMany({
        where: { roomId },
      });

      logger.debug({ roomId }, 'Room messages deleted');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to delete room messages');
      throw error;
    }
  }

  /**
   * Cleanup old messages (keep only last N messages per room)
   */
  private async cleanupOldMessages(roomId: string): Promise<void> {
    try {
      // Get total count of messages
      const count = await prisma.chatMessage.count({
        where: { roomId },
      });

      if (count <= this.MAX_MESSAGES_PER_ROOM) {
        return; // No cleanup needed
      }

      // Get the ID of the Nth message from the end
      const messagesToKeep = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: this.MAX_MESSAGES_PER_ROOM,
        select: { id: true },
      });

      const keepIds = new Set(messagesToKeep.map((m: { id: string }) => m.id));

      // Delete all messages not in the keep list
      await prisma.chatMessage.deleteMany({
        where: {
          roomId,
          id: {
            notIn: Array.from(keepIds),
          },
        },
      });

      logger.debug({ roomId, deletedCount: count - this.MAX_MESSAGES_PER_ROOM }, 'Old messages cleaned up');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to cleanup old messages');
      // Don't throw - this is a background operation
    }
  }

  /**
   * Convert Prisma message to ChatMessage
   */
  private toChatMessage(msg: {
    id: string;
    type: string;
    userId: string | null;
    content: string;
    metadata: unknown;
    createdAt: Date;
    user?: { username: string; avatarUrl: string | null } | null;
  }): ChatMessage {
    if (msg.type === 'system') {
      return {
        id: msg.id,
        type: 'system',
        event: msg.metadata as SystemEvent,
        timestamp: msg.createdAt.getTime(),
      };
    }

    return {
      id: msg.id,
      type: 'user',
      userId: msg.userId || undefined,
      username: msg.user?.username,
      avatarUrl: msg.user?.avatarUrl || undefined,
      content: msg.content,
      timestamp: msg.createdAt.getTime(),
    };
  }
}

export const chatService = new ChatService();
