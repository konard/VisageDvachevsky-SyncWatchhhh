/**
 * Room Service
 * Business logic for room management
 */

import type { Room, RoomParticipant, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../database/client.js';
import { generateRoomCode } from '../../common/utils/room-code.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors/index.js';
import type {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomInput,
} from './schemas.js';

const SALT_ROUNDS = 10;

// Default room expiration: 24 hours from creation
const DEFAULT_ROOM_EXPIRATION_HOURS = 24;

export class RoomService {
  /**
   * Create a new room
   */
  async createRoom(
    ownerId: string,
    input: CreateRoomInput
  ): Promise<Room> {
    const code = generateRoomCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DEFAULT_ROOM_EXPIRATION_HOURS);

    // Hash password if provided
    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    // Create room and add owner as participant in a transaction
    const room = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newRoom = await tx.room.create({
        data: {
          code,
          name: input.name || 'Watch Room',
          ownerId,
          maxParticipants: input.maxParticipants ?? 5,
          passwordHash,
          playbackControl: input.playbackControl || 'owner_only',
          expiresAt,
        },
      });

      // Add owner as a participant with owner role
      await tx.roomParticipant.create({
        data: {
          roomId: newRoom.id,
          userId: ownerId,
          role: 'owner',
          canControl: true,
        },
      });

      return newRoom;
    });

    return room;
  }

  /**
   * Get room by code
   */
  async getRoomByCode(code: string): Promise<Room> {
    const room = await prisma.room.findUnique({
      where: { code },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Check if room has expired
    if (room.expiresAt < new Date()) {
      throw new NotFoundError('Room');
    }

    return room;
  }

  /**
   * Get room with participants
   */
  async getRoomWithParticipants(code: string) {
    const room = await this.getRoomByCode(code);

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      room,
      participants: participants.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        username: p.user?.username || p.guestName || 'Guest',
        avatarUrl: p.user?.avatarUrl,
        role: p.role,
        canControl: p.canControl,
        joinedAt: p.joinedAt,
      })),
    };
  }

  /**
   * Join a room
   */
  async joinRoom(
    code: string,
    input: JoinRoomInput,
    userId?: string
  ): Promise<{ room: Room; participant: RoomParticipant }> {
    const room = await this.getRoomByCode(code);

    // Verify password if room is protected
    if (room.passwordHash) {
      if (!input.password) {
        throw new ForbiddenError('Password required');
      }

      const isValidPassword = await bcrypt.compare(
        input.password,
        room.passwordHash
      );

      if (!isValidPassword) {
        throw new ForbiddenError('Invalid password');
      }
    }

    // Check if user is already in the room
    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: userId || null,
      },
    });

    if (existingParticipant) {
      return { room, participant: existingParticipant };
    }

    // Check participant limit
    const participantCount = await prisma.roomParticipant.count({
      where: { roomId: room.id },
    });

    if (participantCount >= room.maxParticipants) {
      throw new ConflictError('Room is full');
    }

    // Determine role
    const role = userId ? 'participant' : 'guest';

    // Validate guest name if joining as guest
    if (!userId && !input.guestName) {
      throw new BadRequestError('Guest name is required for unauthenticated users');
    }

    // Create participant
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: userId || null,
        guestName: userId ? null : input.guestName,
        role,
        canControl: room.playbackControl === 'all',
      },
    });

    return { room, participant };
  }

  /**
   * Leave a room
   */
  async leaveRoom(code: string, userId: string): Promise<void> {
    const room = await this.getRoomByCode(code);

    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId,
      },
    });

    if (!participant) {
      throw new NotFoundError('Participant');
    }

    // Delete participant
    await prisma.roomParticipant.delete({
      where: { id: participant.id },
    });

    // If owner leaves, delete the room
    if (participant.role === 'owner') {
      await this.deleteRoom(code, userId);
    }
  }

  /**
   * Delete a room (owner only)
   */
  async deleteRoom(code: string, userId: string): Promise<void> {
    const room = await this.getRoomByCode(code);

    // Verify ownership
    if (room.ownerId !== userId) {
      throw new ForbiddenError('Only the owner can delete the room');
    }

    // Delete room (cascade will handle participants)
    await prisma.room.delete({
      where: { id: room.id },
    });
  }

  /**
   * Update room settings (owner only)
   */
  async updateRoom(
    code: string,
    userId: string,
    input: UpdateRoomInput
  ): Promise<Room> {
    const room = await this.getRoomByCode(code);

    // Verify ownership
    if (room.ownerId !== userId) {
      throw new ForbiddenError('Only the owner can update room settings');
    }

    // Hash new password if provided
    let passwordHash: string | null | undefined;
    if (input.password !== undefined) {
      if (input.password === null) {
        passwordHash = null; // Remove password
      } else {
        passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      }
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.maxParticipants && { maxParticipants: input.maxParticipants }),
        ...(passwordHash !== undefined && { passwordHash }),
        ...(input.playbackControl && { playbackControl: input.playbackControl }),
      },
    });

    // If playbackControl changed to 'all', update all participants
    if (input.playbackControl === 'all') {
      await prisma.roomParticipant.updateMany({
        where: {
          roomId: room.id,
          role: { not: 'guest' },
        },
        data: { canControl: true },
      });
    } else if (input.playbackControl === 'owner_only') {
      await prisma.roomParticipant.updateMany({
        where: {
          roomId: room.id,
          role: { not: 'owner' },
        },
        data: { canControl: false },
      });
    }

    return updatedRoom;
  }

  /**
   * Check if user is room owner
   */
  async isRoomOwner(code: string, userId: string): Promise<boolean> {
    const room = await this.getRoomByCode(code);
    return room.ownerId === userId;
  }

  /**
   * Get participant in room
   */
  async getParticipant(
    roomId: string,
    userId: string
  ): Promise<RoomParticipant | null> {
    return prisma.roomParticipant.findFirst({
      where: {
        roomId,
        userId,
      },
    });
  }
}
