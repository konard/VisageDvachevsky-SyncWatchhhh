/**
 * Room History Service
 * Tracks and manages watch history
 */

import { prisma } from '../../database/client.js';
import { NotFoundError, ForbiddenError } from '../../common/errors/index.js';
import type { RoomHistoryEntry, SourceType } from './types.js';

export class RoomHistoryService {
  /**
   * Record a watch session
   */
  async recordWatchSession(
    roomId: string,
    userId: string,
    watchDurationMs: number
  ): Promise<RoomHistoryEntry> {
    // Get room information
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        video: true,
      },
    });

    if (!room) {
      throw new NotFoundError('Room');
    }

    // Determine source type and data
    let sourceType: SourceType;
    let sourceData: Record<string, any>;
    let thumbnail: string | undefined;

    if (room.videoId && room.video) {
      sourceType = 'upload';
      sourceData = {
        videoId: room.video.id,
        filename: room.video.filename,
        duration: room.video.duration,
      };
      // Could generate thumbnail from video here
    } else if (room.youtubeVideoId) {
      sourceType = 'youtube';
      sourceData = {
        videoId: room.youtubeVideoId,
      };
      thumbnail = `https://img.youtube.com/vi/${room.youtubeVideoId}/mqdefault.jpg`;
    } else if (room.externalUrl) {
      sourceType = 'external';
      sourceData = {
        url: room.externalUrl,
      };
    } else {
      sourceType = 'upload';
      sourceData = {};
    }

    // Get participant names
    const participants = room.participants.map((p) =>
      p.user?.username || p.guestName || 'Guest'
    );

    const historyEntry = await prisma.roomHistory.create({
      data: {
        roomId,
        userId,
        roomName: room.name,
        sourceType,
        sourceData: JSON.stringify(sourceData),
        watchDurationMs,
        participants: JSON.stringify(participants),
        thumbnail,
      },
    });

    return {
      ...historyEntry,
      sourceData: JSON.parse(historyEntry.sourceData as string),
      participants: JSON.parse(historyEntry.participants as string) as string[],
    };
  }

  /**
   * Get user's watch history
   */
  async getWatchHistory(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<RoomHistoryEntry[]> {
    const entries = await prisma.roomHistory.findMany({
      where: {
        userId,
        isVisible: true,
      },
      orderBy: { watchedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return entries.map((entry) => ({
      ...entry,
      sourceData: JSON.parse(entry.sourceData as string),
      participants: JSON.parse(entry.participants as string) as string[],
    }));
  }

  /**
   * Get history entry by ID
   */
  async getHistoryEntry(id: string): Promise<RoomHistoryEntry> {
    const entry = await prisma.roomHistory.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundError('History entry');
    }

    return {
      ...entry,
      sourceData: JSON.parse(entry.sourceData as string),
      participants: JSON.parse(entry.participants as string) as string[],
    };
  }

  /**
   * Hide a history entry
   */
  async hideHistoryEntry(id: string, userId: string): Promise<void> {
    const entry = await this.getHistoryEntry(id);

    if (entry.userId !== userId) {
      throw new ForbiddenError('You can only hide your own history entries');
    }

    await prisma.roomHistory.update({
      where: { id },
      data: { isVisible: false },
    });
  }

  /**
   * Show a hidden history entry
   */
  async showHistoryEntry(id: string, userId: string): Promise<void> {
    const entry = await this.getHistoryEntry(id);

    if (entry.userId !== userId) {
      throw new ForbiddenError('You can only show your own history entries');
    }

    await prisma.roomHistory.update({
      where: { id },
      data: { isVisible: true },
    });
  }

  /**
   * Delete a history entry
   */
  async deleteHistoryEntry(id: string, userId: string): Promise<void> {
    const entry = await this.getHistoryEntry(id);

    if (entry.userId !== userId) {
      throw new ForbiddenError('You can only delete your own history entries');
    }

    await prisma.roomHistory.delete({
      where: { id },
    });
  }

  /**
   * Get history count for user
   */
  async getHistoryCount(userId: string): Promise<number> {
    return await prisma.roomHistory.count({
      where: {
        userId,
        isVisible: true,
      },
    });
  }

  /**
   * Clean up old history entries (older than 90 days)
   */
  async cleanupOldHistory(daysToKeep = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.roomHistory.deleteMany({
      where: {
        watchedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
