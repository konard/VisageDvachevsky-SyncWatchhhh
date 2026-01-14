/**
 * Voting Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VotingService } from '../voting.service';
import { prisma } from '../../../database/client';

// Mock Prisma
vi.mock('../../../database/client', () => ({
  prisma: {
    room: {
      findUnique: vi.fn(),
    },
    playbackVote: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    roomParticipant: {
      findFirst: vi.fn(),
    },
  },
}));

describe('VotingService', () => {
  let votingService: VotingService;

  beforeEach(() => {
    votingService = new VotingService();
    vi.clearAllMocks();
  });

  describe('initiatePlaybackVote', () => {
    it('should create a new vote with correct threshold', async () => {
      const mockRoom = {
        id: 'room-123',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
          { id: 'p3' },
          { id: 'p4' },
          { id: 'p5' },
        ],
      };

      const mockVote = {
        id: 'vote-123',
        roomId: 'room-123',
        type: 'pause',
        initiatedBy: 'user-123',
        initiatedAt: new Date(),
        expiresAt: new Date(Date.now() + 15000),
        threshold: 3, // 60% of 5 = 3
        votes: '{}',
        resolved: false,
        passed: false,
      };

      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any);
      vi.mocked(prisma.playbackVote.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.playbackVote.create).mockResolvedValue(mockVote);

      const result = await votingService.initiatePlaybackVote(
        'room-123',
        'user-123',
        'pause'
      );

      expect(result).toEqual({
        ...mockVote,
        votes: {},
      });

      expect(prisma.playbackVote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          roomId: 'room-123',
          type: 'pause',
          initiatedBy: 'user-123',
          threshold: 3, // Ceiling of 5 * 0.6
        }),
      });
    });

    it('should throw error if room not found', async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(null);

      await expect(
        votingService.initiatePlaybackVote('room-123', 'user-123', 'pause')
      ).rejects.toThrow('Room');
    });

    it('should throw error if there is already an active vote', async () => {
      const mockRoom = {
        id: 'room-123',
        participants: [{ id: 'p1' }],
      };

      const existingVote = {
        id: 'vote-existing',
        resolved: false,
      };

      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any);
      vi.mocked(prisma.playbackVote.findFirst).mockResolvedValue(existingVote as any);

      await expect(
        votingService.initiatePlaybackVote('room-123', 'user-123', 'pause')
      ).rejects.toThrow('already an active vote');
    });
  });

  describe('castVote', () => {
    it('should allow participant to cast a vote', async () => {
      const mockVote = {
        id: 'vote-123',
        roomId: 'room-123',
        type: 'pause',
        initiatedBy: 'user-1',
        initiatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000), // Not expired
        threshold: 2,
        votes: '{}',
        resolved: false,
        passed: false,
      };

      const mockParticipant = {
        id: 'p1',
        roomId: 'room-123',
        userId: 'user-2',
      };

      const updatedVote = {
        ...mockVote,
        votes: '{"user-2":"yes"}',
      };

      vi.mocked(prisma.playbackVote.findUnique).mockResolvedValue(mockVote);
      vi.mocked(prisma.roomParticipant.findFirst).mockResolvedValue(mockParticipant as any);
      vi.mocked(prisma.playbackVote.update).mockResolvedValue(updatedVote);

      const result = await votingService.castVote('vote-123', 'user-2', 'yes');

      expect(result.votes).toEqual({ 'user-2': 'yes' });
      expect(prisma.playbackVote.update).toHaveBeenCalledWith({
        where: { id: 'vote-123' },
        data: {
          votes: '{"user-2":"yes"}',
        },
      });
    });

    it('should throw error if vote not found', async () => {
      vi.mocked(prisma.playbackVote.findUnique).mockResolvedValue(null);

      await expect(
        votingService.castVote('vote-123', 'user-1', 'yes')
      ).rejects.toThrow('Vote');
    });

    it('should throw error if vote is already resolved', async () => {
      const mockVote = {
        id: 'vote-123',
        resolved: true,
        expiresAt: new Date(Date.now() + 10000),
      };

      vi.mocked(prisma.playbackVote.findUnique).mockResolvedValue(mockVote as any);

      await expect(
        votingService.castVote('vote-123', 'user-1', 'yes')
      ).rejects.toThrow('already been resolved');
    });

    it('should throw error if user is not a participant', async () => {
      const mockVote = {
        id: 'vote-123',
        roomId: 'room-123',
        resolved: false,
        expiresAt: new Date(Date.now() + 10000),
      };

      vi.mocked(prisma.playbackVote.findUnique).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.roomParticipant.findFirst).mockResolvedValue(null);

      await expect(
        votingService.castVote('vote-123', 'user-999', 'yes')
      ).rejects.toThrow('not a participant');
    });
  });

  describe('getVoteResults', () => {
    it('should calculate vote results correctly', async () => {
      const mockVote = {
        id: 'vote-123',
        type: 'pause',
        votes: '{"user-1":"yes","user-2":"yes","user-3":"no"}',
        threshold: 2,
        passed: true,
        resolved: true,
      };

      vi.mocked(prisma.playbackVote.findUnique).mockResolvedValue(mockVote as any);

      const result = await votingService.getVoteResults('vote-123');

      expect(result).toEqual({
        voteId: 'vote-123',
        type: 'pause',
        yesVotes: 2,
        noVotes: 1,
        threshold: 2,
        passed: true,
        resolved: true,
      });
    });
  });
});
