import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chatService } from '../service.js';
import { prisma } from '../../../config/prisma.js';

vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    chatMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../../config/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserMessage', () => {
    it('should create a user message', async () => {
      const mockMessage = {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        type: 'user',
        content: 'Hello, world!',
        metadata: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage);
      vi.mocked(prisma.chatMessage.count).mockResolvedValue(10);

      const result = await chatService.createUserMessage({
        roomId: 'room-1',
        userId: 'user-1',
        content: 'Hello, world!',
      });

      expect(result).toEqual(mockMessage);
      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          roomId: 'room-1',
          userId: 'user-1',
          type: 'user',
          content: 'Hello, world!',
        },
      });
    });
  });

  describe('createSystemMessage', () => {
    it('should create a system message for join event', async () => {
      const mockMessage = {
        id: 'msg-2',
        roomId: 'room-1',
        userId: null,
        type: 'system',
        content: '',
        metadata: { kind: 'join', username: 'Alice' },
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage);

      const result = await chatService.createSystemMessage({
        roomId: 'room-1',
        event: { kind: 'join', username: 'Alice' },
      });

      expect(result).toEqual(mockMessage);
      expect(prisma.chatMessage.create).toHaveBeenCalledWith({
        data: {
          roomId: 'room-1',
          type: 'system',
          content: '',
          metadata: { kind: 'join', username: 'Alice' },
        },
      });
    });

    it('should create a system message for leave event', async () => {
      const mockMessage = {
        id: 'msg-3',
        roomId: 'room-1',
        userId: null,
        type: 'system',
        content: '',
        metadata: { kind: 'leave', username: 'Bob' },
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage);

      const result = await chatService.createSystemMessage({
        roomId: 'room-1',
        event: { kind: 'leave', username: 'Bob' },
      });

      expect(result).toEqual(mockMessage);
    });

    it('should create a system message for play event', async () => {
      const mockMessage = {
        id: 'msg-4',
        roomId: 'room-1',
        userId: null,
        type: 'system',
        content: '',
        metadata: { kind: 'play' },
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage);

      const result = await chatService.createSystemMessage({
        roomId: 'room-1',
        event: { kind: 'play' },
      });

      expect(result).toEqual(mockMessage);
    });

    it('should create a system message for pause event', async () => {
      const mockMessage = {
        id: 'msg-5',
        roomId: 'room-1',
        userId: null,
        type: 'system',
        content: '',
        metadata: { kind: 'pause' },
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage);

      const result = await chatService.createSystemMessage({
        roomId: 'room-1',
        event: { kind: 'pause' },
      });

      expect(result).toEqual(mockMessage);
    });

    it('should create a system message for seek event', async () => {
      const mockMessage = {
        id: 'msg-6',
        roomId: 'room-1',
        userId: null,
        type: 'system',
        content: '',
        metadata: { kind: 'seek', position: 120 },
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatMessage.create).mockResolvedValue(mockMessage);

      const result = await chatService.createSystemMessage({
        roomId: 'room-1',
        event: { kind: 'seek', position: 120 },
      });

      expect(result).toEqual(mockMessage);
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history in chronological order', async () => {
      const now = new Date();
      const mockMessages = [
        {
          id: 'msg-3',
          roomId: 'room-1',
          userId: 'user-2',
          type: 'user',
          content: 'Third message',
          metadata: null,
          createdAt: new Date(now.getTime() + 2000),
          user: { username: 'Bob', avatarUrl: null },
        },
        {
          id: 'msg-2',
          roomId: 'room-1',
          userId: 'user-1',
          type: 'user',
          content: 'Second message',
          metadata: null,
          createdAt: new Date(now.getTime() + 1000),
          user: { username: 'Alice', avatarUrl: 'https://example.com/avatar.jpg' },
        },
        {
          id: 'msg-1',
          roomId: 'room-1',
          userId: null,
          type: 'system',
          content: '',
          metadata: { kind: 'join', username: 'Alice' },
          createdAt: now,
          user: null,
        },
      ];

      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue(mockMessages as never);

      const result = await chatService.getChatHistory('room-1');

      expect(result).toHaveLength(3);
      // Should be in chronological order (oldest first)
      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
      expect(result[2].id).toBe('msg-3');
      expect(result[0].type).toBe('system');
      expect(result[1].type).toBe('user');
      expect(result[2].type).toBe('user');
    });

    it('should limit history to specified count', async () => {
      vi.mocked(prisma.chatMessage.findMany).mockResolvedValue([]);

      await chatService.getChatHistory('room-1', 50);

      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              username: true,
              avatarUrl: true,
            },
          },
        },
      });
    });
  });

  describe('deleteRoomMessages', () => {
    it('should delete all messages for a room', async () => {
      vi.mocked(prisma.chatMessage.deleteMany).mockResolvedValue({ count: 5 });

      await chatService.deleteRoomMessages('room-1');

      expect(prisma.chatMessage.deleteMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1' },
      });
    });
  });
});
