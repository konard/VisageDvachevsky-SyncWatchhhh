/**
 * Voting Service
 * Manages playback voting system for pause/resume
 */

import { prisma } from '../../database/client.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../common/errors/index.js';
import type {
  PlaybackVote,
  PlaybackVoteType,
  VoteChoice,
} from './types.js';

const VOTE_TIMEOUT_MS = 15000; // 15 seconds
const VOTE_THRESHOLD = 0.6; // 60% majority

export class VotingService {
  /**
   * Initiate a playback vote (pause or resume)
   */
  async initiatePlaybackVote(
    roomId: string,
    initiatedBy: string,
    type: PlaybackVoteType
  ): Promise<PlaybackVote> {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Check if there's already an active vote
    const existingVote = await prisma.playbackVote.findFirst({
      where: {
        roomId,
        resolved: false,
      },
    });

    if (existingVote) {
      throw new ConflictError('There is already an active vote in this room');
    }

    // Calculate threshold based on active participants
    const participantCount = room.participants.length;
    const threshold = Math.ceil(participantCount * VOTE_THRESHOLD);

    const expiresAt = new Date(Date.now() + VOTE_TIMEOUT_MS);

    // Create the vote
    const vote = await prisma.playbackVote.create({
      data: {
        roomId,
        type,
        initiatedBy,
        expiresAt,
        threshold,
        votes: JSON.stringify({}),
      },
    });

    return {
      ...vote,
      type: vote.type as PlaybackVoteType,
      votes: {},
    };
  }

  /**
   * Cast a vote
   */
  async castVote(
    voteId: string,
    userId: string,
    choice: VoteChoice
  ): Promise<PlaybackVote> {
    const vote = await prisma.playbackVote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      throw new NotFoundError('Vote');
    }

    if (vote.resolved) {
      throw new BadRequestError('This vote has already been resolved');
    }

    if (vote.expiresAt < new Date()) {
      // Vote has expired, resolve it
      await this.resolveVote(voteId);
      throw new BadRequestError('This vote has expired');
    }

    // Verify user is in the room
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: vote.roomId,
        userId,
      },
    });

    if (!participant) {
      throw new BadRequestError('You are not a participant in this room');
    }

    // Update votes
    const votes = JSON.parse(vote.votes as string) as Record<string, VoteChoice>;
    votes[userId] = choice;

    const updatedVote = await prisma.playbackVote.update({
      where: { id: voteId },
      data: {
        votes: JSON.stringify(votes),
      },
    });

    // Check if vote should be resolved
    const yesVotes = Object.values(votes).filter((v) => v === 'yes').length;
    if (yesVotes >= vote.threshold) {
      return await this.resolveVote(voteId, true);
    }

    return {
      ...updatedVote,
      type: updatedVote.type as PlaybackVoteType,
      votes,
    };
  }

  /**
   * Get active vote for a room
   */
  async getActiveVote(roomId: string): Promise<PlaybackVote | null> {
    const vote = await prisma.playbackVote.findFirst({
      where: {
        roomId,
        resolved: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!vote) {
      return null;
    }

    return {
      ...vote,
      type: vote.type as PlaybackVoteType,
      votes: JSON.parse(vote.votes as string) as Record<string, VoteChoice>,
    };
  }

  /**
   * Resolve a vote
   */
  async resolveVote(voteId: string, passed = false): Promise<PlaybackVote> {
    const vote = await prisma.playbackVote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      throw new NotFoundError('Vote');
    }

    const votes = JSON.parse(vote.votes as string) as Record<string, VoteChoice>;
    const yesVotes = Object.values(votes).filter((v) => v === 'yes').length;
    const votePassed = passed || yesVotes >= vote.threshold;

    const updatedVote = await prisma.playbackVote.update({
      where: { id: voteId },
      data: {
        resolved: true,
        passed: votePassed,
      },
    });

    return {
      ...updatedVote,
      type: updatedVote.type as PlaybackVoteType,
      votes,
    };
  }

  /**
   * Clean up expired votes
   */
  async cleanupExpiredVotes(): Promise<number> {
    const expiredVotes = await prisma.playbackVote.findMany({
      where: {
        resolved: false,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    for (const vote of expiredVotes) {
      await this.resolveVote(vote.id, false);
    }

    return expiredVotes.length;
  }

  /**
   * Get vote results
   */
  async getVoteResults(voteId: string): Promise<{
    voteId: string;
    type: PlaybackVoteType;
    yesVotes: number;
    noVotes: number;
    threshold: number;
    passed: boolean;
    resolved: boolean;
  }> {
    const vote = await prisma.playbackVote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      throw new NotFoundError('Vote');
    }

    const votes = JSON.parse(vote.votes as string) as Record<string, VoteChoice>;
    const yesVotes = Object.values(votes).filter((v) => v === 'yes').length;
    const noVotes = Object.values(votes).filter((v) => v === 'no').length;

    return {
      voteId: vote.id,
      type: vote.type as PlaybackVoteType,
      yesVotes,
      noVotes,
      threshold: vote.threshold,
      passed: vote.passed,
      resolved: vote.resolved,
    };
  }
}
