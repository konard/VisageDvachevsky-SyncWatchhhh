/**
 * Scheduled Room Service
 * Manages room scheduling with timezone handling
 */

import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { prisma } from '../../database/client.js';
import { generateRoomCode } from '../../common/utils/room-code.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors/index.js';
import type {
  ScheduledRoom,
  ScheduledRoomStatus,
  CreateScheduledRoomInput,
} from './types.js';

const SALT_ROUNDS = 10;

/**
 * Helper to convert Prisma ScheduledRoom to typed ScheduledRoom
 */
function toScheduledRoom(room: {
  id: string;
  creatorId: string;
  scheduledFor: Date;
  timezone: string;
  name: string;
  code: string;
  maxParticipants: number;
  passwordHash: string | null;
  playbackControl: string;
  videoId: string | null;
  youtubeVideoId: string | null;
  externalUrl: string | null;
  status: string;
  remindersSent: boolean;
  invitedUsers: unknown;
  activatedRoomId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ScheduledRoom {
  return {
    ...room,
    status: room.status as ScheduledRoomStatus,
    invitedUsers: JSON.parse(room.invitedUsers as string) as string[],
  };
}

export class ScheduledRoomService {
  /**
   * Create a scheduled room
   */
  async createScheduledRoom(
    creatorId: string,
    input: CreateScheduledRoomInput
  ): Promise<ScheduledRoom> {
    // Validate scheduled time is in the future
    if (input.scheduledFor <= new Date()) {
      throw new BadRequestError('Scheduled time must be in the future');
    }

    const code = generateRoomCode();

    // Hash password if provided
    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    }

    const scheduledRoom = await prisma.scheduledRoom.create({
      data: {
        creatorId,
        scheduledFor: input.scheduledFor,
        timezone: input.timezone,
        name: input.name,
        code,
        maxParticipants: input.maxParticipants ?? 5,
        passwordHash,
        playbackControl: input.playbackControl || 'owner_only',
        videoId: input.videoId,
        youtubeVideoId: input.youtubeVideoId,
        externalUrl: input.externalUrl,
        invitedUsers: JSON.stringify(input.invitedUsers || []),
      },
    });

    return toScheduledRoom(scheduledRoom);
  }

  /**
   * Get scheduled room by ID
   */
  async getScheduledRoom(id: string): Promise<ScheduledRoom> {
    const room = await prisma.scheduledRoom.findUnique({
      where: { id },
    });

    if (!room) {
      throw new NotFoundError('Scheduled room');
    }

    return toScheduledRoom(room);
  }

  /**
   * Get scheduled room by code
   */
  async getScheduledRoomByCode(code: string): Promise<ScheduledRoom> {
    const room = await prisma.scheduledRoom.findUnique({
      where: { code },
    });

    if (!room) {
      throw new NotFoundError('Scheduled room');
    }

    return toScheduledRoom(room);
  }

  /**
   * Get user's scheduled rooms
   */
  async getUserScheduledRooms(userId: string): Promise<ScheduledRoom[]> {
    const rooms = await prisma.scheduledRoom.findMany({
      where: {
        creatorId: userId,
        status: {
          in: ['scheduled', 'active'],
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    return rooms.map(toScheduledRoom);
  }

  /**
   * Update scheduled room
   */
  async updateScheduledRoom(
    id: string,
    actorId: string,
    updates: Partial<CreateScheduledRoomInput>
  ): Promise<ScheduledRoom> {
    const room = await this.getScheduledRoom(id);

    if (room.creatorId !== actorId) {
      throw new ForbiddenError('Only the creator can update the scheduled room');
    }

    if (room.status !== 'scheduled') {
      throw new BadRequestError('Cannot update a room that is not in scheduled status');
    }

    const data: any = {};

    if (updates.scheduledFor) {
      if (updates.scheduledFor <= new Date()) {
        throw new BadRequestError('Scheduled time must be in the future');
      }
      data.scheduledFor = updates.scheduledFor;
    }

    if (updates.timezone) data.timezone = updates.timezone;
    if (updates.name) data.name = updates.name;
    if (updates.maxParticipants) data.maxParticipants = updates.maxParticipants;
    if (updates.playbackControl) data.playbackControl = updates.playbackControl;
    if (updates.videoId) data.videoId = updates.videoId;
    if (updates.youtubeVideoId) data.youtubeVideoId = updates.youtubeVideoId;
    if (updates.externalUrl) data.externalUrl = updates.externalUrl;
    if (updates.invitedUsers) data.invitedUsers = JSON.stringify(updates.invitedUsers);

    if (updates.password) {
      data.passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const updated = await prisma.scheduledRoom.update({
      where: { id },
      data,
    });

    return toScheduledRoom(updated);
  }

  /**
   * Cancel scheduled room
   */
  async cancelScheduledRoom(id: string, actorId: string): Promise<void> {
    const room = await this.getScheduledRoom(id);

    if (room.creatorId !== actorId) {
      throw new ForbiddenError('Only the creator can cancel the scheduled room');
    }

    await prisma.scheduledRoom.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  /**
   * Activate scheduled room (create actual room)
   */
  async activateScheduledRoom(id: string): Promise<string> {
    const scheduledRoom = await this.getScheduledRoom(id);

    if (scheduledRoom.status !== 'scheduled') {
      throw new BadRequestError('Room is not in scheduled status');
    }

    // Create the actual room
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const room = await prisma.room.create({
      data: {
        code: scheduledRoom.code,
        name: scheduledRoom.name,
        ownerId: scheduledRoom.creatorId,
        maxParticipants: scheduledRoom.maxParticipants,
        passwordHash: scheduledRoom.passwordHash,
        playbackControl: scheduledRoom.playbackControl,
        videoId: scheduledRoom.videoId,
        youtubeVideoId: scheduledRoom.youtubeVideoId,
        externalUrl: scheduledRoom.externalUrl,
        expiresAt,
      },
    });

    // Add creator as participant
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        oderId: nanoid(10),
        userId: scheduledRoom.creatorId,
        role: 'owner',
        canControl: true,
      },
    });

    // Update scheduled room status
    await prisma.scheduledRoom.update({
      where: { id },
      data: {
        status: 'active',
        activatedRoomId: room.id,
      },
    });

    return room.id;
  }

  /**
   * Get rooms that need activation
   */
  async getRoomsNeedingActivation(): Promise<ScheduledRoom[]> {
    const now = new Date();
    const rooms = await prisma.scheduledRoom.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lte: now,
        },
      },
    });

    return rooms.map(toScheduledRoom);
  }

  /**
   * Get rooms that need reminders (30 min before)
   */
  async getRoomsNeedingReminders(): Promise<ScheduledRoom[]> {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    const rooms = await prisma.scheduledRoom.findMany({
      where: {
        status: 'scheduled',
        remindersSent: false,
        scheduledFor: {
          lte: reminderTime,
          gte: now,
        },
      },
    });

    return rooms.map(toScheduledRoom);
  }

  /**
   * Mark reminders as sent
   */
  async markRemindersSent(id: string): Promise<void> {
    await prisma.scheduledRoom.update({
      where: { id },
      data: { remindersSent: true },
    });
  }

  /**
   * Mark old scheduled rooms as expired
   */
  async expireOldScheduledRooms(): Promise<number> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const result = await prisma.scheduledRoom.updateMany({
      where: {
        status: 'scheduled',
        scheduledFor: {
          lt: oneDayAgo,
        },
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }
}
