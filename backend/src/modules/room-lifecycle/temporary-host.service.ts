/**
 * Temporary Host Service
 * Manages temporary host permissions and delegation
 */

import { prisma } from '../../database/client.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors/index.js';
import type {
  HostPermission,
  TemporaryHostSession,
  GrantTemporaryHostInput,
} from './types.js';

export class TemporaryHostService {
  /**
   * Grant temporary host permissions to a user
   */
  async grantTemporaryHost(
    actorId: string,
    input: GrantTemporaryHostInput
  ): Promise<TemporaryHostSession> {
    const { roomId, targetUserId, permissions, durationMs } = input;

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Verify actor is the permanent owner
    if (room.ownerId !== actorId) {
      throw new ForbiddenError('Only the room owner can grant temporary host permissions');
    }

    // Verify target user is in the room
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: targetUserId,
        },
      },
    });

    if (!participant) {
      throw new BadRequestError('Target user is not in the room');
    }

    // Calculate expiration
    const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;

    // Check if there's an existing session for this user
    const existing = await prisma.temporaryHost.findUnique({
      where: {
        roomId_temporaryHostId: {
          roomId,
          temporaryHostId: targetUserId,
        },
      },
    });

    let session;
    if (existing) {
      // Update existing session
      session = await prisma.temporaryHost.update({
        where: { id: existing.id },
        data: {
          permissions: JSON.stringify(permissions),
          expiresAt,
          revoked: false,
          grantedAt: new Date(),
        },
      });
    } else {
      // Create new session
      session = await prisma.temporaryHost.create({
        data: {
          roomId,
          permanentOwnerId: actorId,
          temporaryHostId: targetUserId,
          permissions: JSON.stringify(permissions),
          expiresAt,
        },
      });
    }

    return {
      ...session,
      permissions: JSON.parse(session.permissions as string) as HostPermission[],
    };
  }

  /**
   * Revoke temporary host permissions
   */
  async revokeTemporaryHost(
    actorId: string,
    roomId: string,
    targetUserId: string
  ): Promise<void> {
    // Verify room exists and actor is owner
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    if (room.ownerId !== actorId) {
      throw new ForbiddenError('Only the room owner can revoke temporary host permissions');
    }

    // Revoke the session
    await prisma.temporaryHost.updateMany({
      where: {
        roomId,
        temporaryHostId: targetUserId,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
  }

  /**
   * Get active temporary host session for a user in a room
   */
  async getActiveSession(
    roomId: string,
    userId: string
  ): Promise<TemporaryHostSession | null> {
    const session = await prisma.temporaryHost.findFirst({
      where: {
        roomId,
        temporaryHostId: userId,
        revoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!session) {
      return null;
    }

    return {
      ...session,
      permissions: JSON.parse(session.permissions as string) as HostPermission[],
    };
  }

  /**
   * Check if a user has a specific permission in a room
   */
  async hasPermission(
    roomId: string,
    userId: string,
    permission: HostPermission
  ): Promise<boolean> {
    // Check if user is the permanent owner
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (room?.ownerId === userId) {
      return true;
    }

    // Check temporary host session
    const session = await this.getActiveSession(roomId, userId);
    if (!session) {
      return false;
    }

    return session.permissions.includes(permission);
  }

  /**
   * Get all active temporary hosts in a room
   */
  async getActiveHosts(roomId: string): Promise<TemporaryHostSession[]> {
    const sessions = await prisma.temporaryHost.findMany({
      where: {
        roomId,
        revoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return sessions.map((session) => ({
      ...session,
      permissions: JSON.parse(session.permissions as string) as HostPermission[],
    }));
  }

  /**
   * Clean up expired temporary host sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.temporaryHost.updateMany({
      where: {
        revoked: false,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        revoked: true,
      },
    });

    return result.count;
  }
}
