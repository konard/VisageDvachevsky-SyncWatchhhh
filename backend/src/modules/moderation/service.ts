/**
 * Moderation Service
 * Business logic for abuse protection and moderation
 */

import type { UserReport, Prisma } from '@prisma/client';
import { prisma } from '../../database/client.js';
import { redis } from '../../database/redis.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors/index.js';
import type {
  CreateReportInput,
  UpdateReportStatusInput,
  MuteUserInput,
  ShadowMuteInput,
  ReportReason,
} from './schemas.js';

export class ModerationService {
  /**
   * Create a user report
   */
  async createReport(
    reporterId: string,
    input: CreateReportInput
  ): Promise<UserReport> {
    // Verify reporter and reported user exist
    const [reporter, reported] = await Promise.all([
      prisma.user.findUnique({ where: { id: reporterId } }),
      prisma.user.findUnique({ where: { id: input.reportedUserId } }),
    ]);

    if (!reporter || !reported) {
      throw new NotFoundError('User');
    }

    // Cannot report yourself
    if (reporterId === input.reportedUserId) {
      throw new BadRequestError('Cannot report yourself');
    }

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Get recent chat logs as evidence
    const chatLogs = await this.getChatLogsForEvidence(
      input.roomId,
      input.reportedUserId
    );

    // Create report
    const report = await prisma.userReport.create({
      data: {
        reporterId,
        reportedUserId: input.reportedUserId,
        roomId: input.roomId,
        reason: input.reason,
        description: input.description,
        evidence: {
          chatLogs,
          timestamp: new Date().toISOString(),
        },
        status: 'pending',
      },
    });

    // Check if this user has multiple pending reports
    const pendingReportCount = await prisma.userReport.count({
      where: {
        reportedUserId: input.reportedUserId,
        status: 'pending',
      },
    });

    // Alert moderators if multiple reports (threshold: 3)
    if (pendingReportCount >= 3) {
      await this.alertModerators(input.reportedUserId, pendingReportCount);
    }

    return report;
  }

  /**
   * Get chat logs for evidence
   */
  private async getChatLogsForEvidence(
    roomId: string,
    userId: string
  ): Promise<string[]> {
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        userId,
        type: 'user',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        content: true,
        createdAt: true,
      },
    });

    return messages.map(
      (msg) => `[${msg.createdAt.toISOString()}] ${msg.content}`
    );
  }

  /**
   * Alert moderators about multiple reports
   */
  private async alertModerators(
    userId: string,
    reportCount: number
  ): Promise<void> {
    // Store alert in Redis for moderator dashboard
    await redis.zadd(
      'moderation:alerts',
      Date.now(),
      JSON.stringify({
        userId,
        reportCount,
        timestamp: new Date().toISOString(),
      })
    );

    // In a production system, this would also:
    // - Send notifications to moderator accounts
    // - Create audit log entry
    // - Potentially auto-flag the user for review
  }

  /**
   * Get all reports (moderator only)
   */
  async getReports(filters?: {
    status?: string;
    reportedUserId?: string;
    limit?: number;
  }): Promise<UserReport[]> {
    const where: Prisma.UserReportWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.reportedUserId) {
      where.reportedUserId = filters.reportedUserId;
    }

    return prisma.userReport.findMany({
      where,
      include: {
        reporter: {
          select: { id: true, username: true, email: true },
        },
        reported: {
          select: { id: true, username: true, email: true },
        },
        room: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });
  }

  /**
   * Update report status (moderator only)
   */
  async updateReportStatus(
    reportId: string,
    reviewerId: string,
    input: UpdateReportStatusInput
  ): Promise<UserReport> {
    const report = await prisma.userReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report');
    }

    return prisma.userReport.update({
      where: { id: reportId },
      data: {
        status: input.status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Temporary mute a user
   */
  async muteUser(
    moderatorId: string,
    input: MuteUserInput
  ): Promise<{ success: boolean; expiresAt: Date }> {
    // Verify room exists and moderator has permission
    const room = await prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Only room owner can mute (in production, add moderator role)
    if (room.ownerId !== moderatorId) {
      throw new ForbiddenError('Only room owner can mute users');
    }

    const expiresAt = new Date(Date.now() + input.duration);

    const muteData = {
      userId: input.targetUserId,
      roomId: input.roomId,
      mutedBy: moderatorId,
      reason: input.reason,
      expiresAt: expiresAt.toISOString(),
      scope: input.scope,
    };

    // Store in Redis with auto-expiration
    await redis.set(
      `room:${input.roomId}:mute:${input.targetUserId}`,
      JSON.stringify(muteData),
      'PX',
      input.duration
    );

    return { success: true, expiresAt };
  }

  /**
   * Check if user is muted
   */
  async isMuted(
    roomId: string,
    userId: string,
    scope?: 'voice' | 'chat' | 'both'
  ): Promise<boolean> {
    const muteData = await redis.get(`room:${roomId}:mute:${userId}`);

    if (!muteData) {
      return false;
    }

    try {
      const mute = JSON.parse(muteData);

      // Check if mute applies to the requested scope
      if (scope && mute.scope !== 'both' && mute.scope !== scope) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Unmute a user (manual unmute before expiration)
   */
  async unmuteUser(roomId: string, userId: string): Promise<boolean> {
    const result = await redis.del(`room:${roomId}:mute:${userId}`);
    return result > 0;
  }

  /**
   * Shadow mute a user (admin only)
   */
  async shadowMute(
    adminId: string,
    input: ShadowMuteInput
  ): Promise<boolean> {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: input.roomId },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Only room owner can shadow mute (in production, add admin role check)
    if (room.ownerId !== adminId) {
      throw new ForbiddenError('Only admins can shadow mute users');
    }

    // Add user to shadow muted set
    const result = await redis.sadd(
      `room:${input.roomId}:shadow_muted`,
      input.targetUserId
    );

    return result > 0;
  }

  /**
   * Check if user is shadow muted
   */
  async isShadowMuted(roomId: string, userId: string): Promise<boolean> {
    const result = await redis.sismember(
      `room:${roomId}:shadow_muted`,
      userId
    );
    return result === 1;
  }

  /**
   * Remove shadow mute
   */
  async removeShadowMute(roomId: string, userId: string): Promise<boolean> {
    const result = await redis.srem(`room:${roomId}:shadow_muted`, userId);
    return result > 0;
  }

  /**
   * Check auto-moderation rules
   */
  async checkAutoModeration(
    roomId: string,
    userId: string,
    content: string
  ): Promise<{
    allowed: boolean;
    action?: 'warn' | 'delete' | 'mute';
    reason?: string;
  }> {
    // Spam detection: repeated characters
    const spamPattern = /(.)\1{10,}/;
    if (spamPattern.test(content)) {
      return {
        allowed: false,
        action: 'delete',
        reason: 'Spam detected: excessive repeated characters',
      };
    }

    // Link spam detection: multiple links
    const linkPattern = /(https?:\/\/[^\s]+)/g;
    const links = content.match(linkPattern);
    if (links && links.length >= 3) {
      return {
        allowed: false,
        action: 'warn',
        reason: 'Too many links in one message',
      };
    }

    // Rate limiting: rapid messages
    const messageCount = await redis.incr(`rate:chat:${userId}:${roomId}`);
    if (messageCount === 1) {
      await redis.expire(`rate:chat:${userId}:${roomId}`, 10);
    }

    if (messageCount > 10) {
      // More than 10 messages in 10 seconds
      // Auto-mute for 1 minute
      await this.muteUser(userId, {
        targetUserId: userId,
        roomId,
        duration: 60000,
        scope: 'chat',
        reason: 'Automatic mute: sending messages too quickly',
      });

      return {
        allowed: false,
        action: 'mute',
        reason: 'Rate limit exceeded: sending messages too quickly',
      };
    }

    return { allowed: true };
  }
}
