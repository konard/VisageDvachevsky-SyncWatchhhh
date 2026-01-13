import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { Room as PrismaRoom, RoomParticipant as PrismaRoomParticipant } from '@prisma/client';
import bcrypt from 'bcrypt';

export type RoomWithParticipants = PrismaRoom & {
  participants: PrismaRoomParticipant[];
};

/**
 * Room Service
 * Handles database operations for rooms and participants
 */
export class RoomService {
  /**
   * Get room by code with participants
   */
  async getRoomByCode(code: string): Promise<RoomWithParticipants | null> {
    try {
      const room = await prisma.room.findUnique({
        where: { code },
        include: {
          participants: true,
        },
      });

      return room;
    } catch (error) {
      logger.error({ error: (error as Error).message, code }, 'Failed to get room by code');
      throw error;
    }
  }

  /**
   * Get room by ID with participants
   */
  async getRoomById(id: string): Promise<RoomWithParticipants | null> {
    try {
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          participants: true,
        },
      });

      return room;
    } catch (error) {
      logger.error({ error: (error as Error).message, id }, 'Failed to get room by ID');
      throw error;
    }
  }

  /**
   * Verify room password
   */
  async verifyPassword(room: PrismaRoom, password: string): Promise<boolean> {
    if (!room.passwordHash) {
      return true; // No password required
    }

    try {
      return await bcrypt.compare(password, room.passwordHash);
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId: room.id }, 'Failed to verify password');
      throw error;
    }
  }

  /**
   * Create participant record
   */
  async createParticipant(data: {
    roomId: string;
    userId?: string;
    guestName?: string;
    role: 'owner' | 'participant' | 'guest';
    canControl: boolean;
  }): Promise<PrismaRoomParticipant> {
    try {
      const participant = await prisma.roomParticipant.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          guestName: data.guestName,
          role: data.role,
          canControl: data.canControl,
        },
      });

      logger.debug({ participantId: participant.id, roomId: data.roomId }, 'Participant created');

      return participant;
    } catch (error) {
      logger.error({ error: (error as Error).message, data }, 'Failed to create participant');
      throw error;
    }
  }

  /**
   * Remove participant record
   */
  async removeParticipant(participantId: string): Promise<void> {
    try {
      await prisma.roomParticipant.delete({
        where: { id: participantId },
      });

      logger.debug({ participantId }, 'Participant removed');
    } catch (error) {
      logger.error({ error: (error as Error).message, participantId }, 'Failed to remove participant');
      throw error;
    }
  }

  /**
   * Get participant by oderId
   */
  async getParticipantByOderId(roomId: string, oderId: string): Promise<PrismaRoomParticipant | null> {
    try {
      const participant = await prisma.roomParticipant.findUnique({
        where: {
          roomId_oderId: {
            roomId,
            oderId,
          },
        },
      });

      return participant;
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId, oderId }, 'Failed to get participant by oderId');
      throw error;
    }
  }

  /**
   * Check if user can control playback
   */
  canControlPlayback(room: PrismaRoom, participant: PrismaRoomParticipant): boolean {
    // Owner can always control
    if (participant.role === 'owner') {
      return true;
    }

    // Check playback control settings
    switch (room.playbackControl) {
      case 'owner_only':
        return false;
      case 'all':
        return true;
      case 'selected':
        return participant.canControl;
      default:
        return false;
    }
  }
}

export const roomService = new RoomService();
