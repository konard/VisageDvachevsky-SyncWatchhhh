/**
 * Idle Room Service
 * Manages automatic closure of idle rooms
 */

import { prisma } from '../../database/client.js';
import { DEFAULT_IDLE_POLICY, type RoomIdlePolicy } from './types.js';

export class IdleRoomService {
  private policy: RoomIdlePolicy;

  constructor(policy: RoomIdlePolicy = DEFAULT_IDLE_POLICY) {
    this.policy = policy;
  }

  /**
   * Update room activity timestamp
   */
  async updateActivity(roomId: string): Promise<void> {
    await prisma.room.update({
      where: { id: roomId },
      data: { lastActivityAt: new Date() },
    });
  }

  /**
   * Get last activity time for a room
   */
  async getLastActivityTime(roomId: string): Promise<Date | null> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { lastActivityAt: true },
    });

    return room?.lastActivityAt || null;
  }

  /**
   * Get idle time in milliseconds
   */
  async getIdleTime(roomId: string): Promise<number> {
    const lastActivity = await this.getLastActivityTime(roomId);
    if (!lastActivity) {
      return 0;
    }

    return Date.now() - lastActivity.getTime();
  }

  /**
   * Check all rooms and close idle ones
   * Returns array of [roomsWarned, roomsClosed]
   */
  async checkIdleRooms(): Promise<[number, number]> {
    const now = new Date();
    const warningThreshold = new Date(
      now.getTime() - this.policy.maxIdleTimeMs + this.policy.warningBeforeMs
    );
    const closeThreshold = new Date(now.getTime() - this.policy.maxIdleTimeMs);

    // Get active rooms
    const rooms = await prisma.room.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        code: true,
        lastActivityAt: true,
      },
    });

    let warningsCount = 0;
    let closedCount = 0;

    for (const room of rooms) {
      const lastActivity = room.lastActivityAt;

      if (lastActivity <= closeThreshold) {
        // Room is idle too long, close it
        await this.closeRoom(room.id, 'idle_timeout');
        closedCount++;
      } else if (lastActivity <= warningThreshold) {
        // Warn about upcoming closure
        const minutesRemaining = Math.ceil(
          (this.policy.maxIdleTimeMs - (now.getTime() - lastActivity.getTime())) / 60000
        );
        await this.warnRoomClosing(room.id, minutesRemaining);
        warningsCount++;
      }
    }

    return [warningsCount, closedCount];
  }

  /**
   * Close a room due to inactivity
   */
  private async closeRoom(roomId: string, reason: string): Promise<void> {
    // Delete the room (cascades to participants, messages, etc.)
    await prisma.room.delete({
      where: { id: roomId },
    });

    // Could emit socket event here to notify participants
  }

  /**
   * Warn participants about upcoming room closure
   */
  private async warnRoomClosing(roomId: string, minutesRemaining: number): Promise<void> {
    // Create system message in chat
    await prisma.chatMessage.create({
      data: {
        roomId,
        type: 'system',
        content: `This room will be closed due to inactivity in ${minutesRemaining} minute(s). Send a message or control playback to keep it active.`,
        metadata: JSON.stringify({
          kind: 'idle_warning',
          minutesRemaining,
        }),
      },
    });

    // Could emit socket event here for real-time warning
  }

  /**
   * Get rooms that are about to be closed
   */
  async getRoomsNearingClosure(): Promise<
    Array<{ roomId: string; code: string; minutesRemaining: number }>
  > {
    const now = new Date();
    const warningThreshold = new Date(
      now.getTime() - this.policy.maxIdleTimeMs + this.policy.warningBeforeMs
    );

    const rooms = await prisma.room.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
        lastActivityAt: {
          lte: warningThreshold,
        },
      },
      select: {
        id: true,
        code: true,
        lastActivityAt: true,
      },
    });

    return rooms.map((room) => {
      const idleTime = now.getTime() - room.lastActivityAt.getTime();
      const minutesRemaining = Math.max(
        0,
        Math.ceil((this.policy.maxIdleTimeMs - idleTime) / 60000)
      );

      return {
        roomId: room.id,
        code: room.code,
        minutesRemaining,
      };
    });
  }

  /**
   * Start background job to check idle rooms
   * Returns interval ID that can be used to stop the job
   */
  startIdleCheckJob(): NodeJS.Timeout {
    const intervalId = setInterval(async () => {
      try {
        const [warned, closed] = await this.checkIdleRooms();
        if (warned > 0 || closed > 0) {
          console.log(`Idle room check: ${warned} warned, ${closed} closed`);
        }
      } catch (error) {
        console.error('Error checking idle rooms:', error);
      }
    }, this.policy.checkIntervalMs);

    return intervalId;
  }
}
