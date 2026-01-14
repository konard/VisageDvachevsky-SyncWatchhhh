/**
 * Room Service
 * Business logic for room management
 */

import type { Room, RoomParticipant, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../database/client.js';
import { generateRoomCode } from '../../common/utils/room-code.js';
import { generateAnonymousNickname } from '../../common/utils/anonymous-names.js';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../common/errors/index.js';
import type {
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomInput,
} from './schemas.js';

const SALT_ROUNDS = 10;

// Default room expiration: 24 hours from creation
const DEFAULT_ROOM_EXPIRATION_HOURS = 24;

// Privacy preset configurations
type PrivacyPreset = 'public' | 'friends_only' | 'private' | 'anonymous';

interface PrivacySettings {
  allowAnonymous: boolean;
  requireAuth: boolean;
  showRealNames: boolean;
  forceRelayMode: boolean;
}

const PRIVACY_PRESETS: Record<PrivacyPreset, PrivacySettings> = {
  public: {
    allowAnonymous: true,
    requireAuth: false,
    showRealNames: true,
    forceRelayMode: false,
  },
  friends_only: {
    allowAnonymous: false,
    requireAuth: true,
    showRealNames: true,
    forceRelayMode: false,
  },
  private: {
    allowAnonymous: false,
    requireAuth: true,
    showRealNames: true,
    forceRelayMode: false,
  },
  anonymous: {
    allowAnonymous: true,
    requireAuth: false,
    showRealNames: false,
    forceRelayMode: true,
  },
};

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

    // Get privacy settings based on preset
    const privacyPreset = (input.privacyPreset || 'public') as PrivacyPreset;
    const privacySettings = PRIVACY_PRESETS[privacyPreset];

    // Create room and add owner as participant in a transaction
    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          code,
          name: input.name || 'Watch Room',
          ownerId,
          maxParticipants: input.maxParticipants ?? 5,
          passwordHash,
          playbackControl: input.playbackControl || 'owner_only',
          expiresAt,
          privacyPreset,
          ...privacySettings,
        },
      });

      // Add owner as a participant with owner role
      await tx.roomParticipant.create({
        data: {
          roomId: newRoom.id,
          userId: ownerId,
          role: 'owner',
          canControl: true,
        } as Prisma.RoomParticipantCreateInput,
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

    // Handle guest name based on room privacy settings
    let guestName: string | null = null;
    if (!userId) {
      if (room.showRealNames) {
        // Room allows real names - use provided name or generate anonymous
        guestName = input.guestName || generateAnonymousNickname();
      } else {
        // Anonymous room - always generate anonymous nickname
        guestName = generateAnonymousNickname();
      }
    }

    // Create participant
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: userId || null,
        guestName,
        role,
        canControl: room.playbackControl === 'all',
      } as Prisma.RoomParticipantCreateInput,
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

    // Get privacy settings if preset changed
    let privacySettings: Partial<PrivacySettings> = {};
    if (input.privacyPreset) {
      const preset = input.privacyPreset as PrivacyPreset;
      privacySettings = PRIVACY_PRESETS[preset];
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.maxParticipants && { maxParticipants: input.maxParticipants }),
        ...(passwordHash !== undefined && { passwordHash }),
        ...(input.playbackControl && { playbackControl: input.playbackControl }),
        ...(input.privacyPreset && { privacyPreset: input.privacyPreset }),
        ...privacySettings,
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
