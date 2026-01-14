/**
 * Reactions Service
 * Handles video reactions with timeline attachment and replay features
 */

import { redis } from '../../database/redis.js';
import { prisma } from '../../common/utils/prisma.js';
import { VideoReaction, TimelineReaction, ReactionCreate, AnimationType } from './types.js';
import { randomUUID } from 'crypto';

const REACTIONS_PER_ROOM_LIMIT = 1000;
const REACTION_RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REACTIONS_PER_MINUTE = 10;

export class ReactionsService {
  /**
   * Create a new reaction
   */
  async createReaction(
    userId: string | undefined,
    guestName: string | undefined,
    reactionData: ReactionCreate
  ): Promise<VideoReaction> {
    // Check rate limit
    await this.checkRateLimit(userId || guestName || 'anonymous', reactionData.roomId);

    // Generate random position for visual variety
    const position = {
      x: Math.random() * 80 + 10, // 10-90%
      y: Math.random() * 20 + 70, // 70-90% (bottom area)
    };

    const reaction: VideoReaction = {
      id: randomUUID(),
      roomId: reactionData.roomId,
      userId,
      username: userId ? await this.getUsername(userId) : undefined,
      guestName,
      emoji: reactionData.emoji,
      position,
      mediaTimeMs: reactionData.mediaTimeMs,
      animation: reactionData.animation || 'float',
      createdAt: Date.now(),
    };

    // Store in Redis for quick access and replay
    await redis.lpush(
      `room:${reactionData.roomId}:reactions`,
      JSON.stringify(reaction)
    );

    // Trim to keep only the latest reactions
    await redis.ltrim(
      `room:${reactionData.roomId}:reactions`,
      0,
      REACTIONS_PER_ROOM_LIMIT - 1
    );

    // Also store in database for persistence
    await prisma.videoReaction.create({
      data: {
        id: reaction.id,
        roomId: reactionData.roomId,
        userId: userId || null,
        guestName: guestName || null,
        emoji: reactionData.emoji,
        positionX: position.x,
        positionY: position.y,
        mediaTimeMs: reactionData.mediaTimeMs,
        animation: reactionData.animation || 'float',
      },
    });

    return reaction;
  }

  /**
   * Get reactions for a specific time range
   */
  async getReactionsInRange(
    roomId: string,
    startMs: number,
    endMs: number
  ): Promise<VideoReaction[]> {
    const reactionsJson = await redis.lrange(`room:${roomId}:reactions`, 0, -1);

    const reactions: VideoReaction[] = reactionsJson
      .map((json) => {
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      })
      .filter(
        (r): r is VideoReaction =>
          r !== null && r.mediaTimeMs >= startMs && r.mediaTimeMs <= endMs
      );

    return reactions.sort((a, b) => a.mediaTimeMs - b.mediaTimeMs);
  }

  /**
   * Get timeline reactions grouped by intervals
   */
  async getTimelineReactions(roomId: string, intervalMs: number = 30000): Promise<TimelineReaction[]> {
    const reactionsJson = await redis.lrange(`room:${roomId}:reactions`, 0, -1);

    const reactions: VideoReaction[] = reactionsJson
      .map((json) => {
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      })
      .filter((r): r is VideoReaction => r !== null);

    // Group by time intervals
    const grouped = new Map<number, Map<string, number>>();

    for (const reaction of reactions) {
      const bucket = Math.floor(reaction.mediaTimeMs / intervalMs) * intervalMs;
      let bucketReactions = grouped.get(bucket);

      if (!bucketReactions) {
        bucketReactions = new Map<string, number>();
        grouped.set(bucket, bucketReactions);
      }

      const count = bucketReactions.get(reaction.emoji) || 0;
      bucketReactions.set(reaction.emoji, count + 1);
    }

    // Convert to array
    return Array.from(grouped.entries())
      .map(([mediaTimeMs, reactions]) => ({
        mediaTimeMs,
        reactions,
      }))
      .sort((a, b) => a.mediaTimeMs - b.mediaTimeMs);
  }

  /**
   * Get all reactions for a room
   */
  async getRoomReactions(roomId: string, limit: number = 100): Promise<VideoReaction[]> {
    const reactionsJson = await redis.lrange(`room:${roomId}:reactions`, 0, limit - 1);

    const reactions: VideoReaction[] = reactionsJson
      .map((json) => {
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      })
      .filter((r): r is VideoReaction => r !== null);

    return reactions;
  }

  /**
   * Clear reactions for a room
   */
  async clearRoomReactions(roomId: string): Promise<void> {
    await redis.del(`room:${roomId}:reactions`);
    await prisma.videoReaction.deleteMany({
      where: { roomId },
    });
  }

  /**
   * Check rate limit for reactions
   */
  private async checkRateLimit(identifier: string, roomId: string): Promise<void> {
    const key = `reaction:ratelimit:${roomId}:${identifier}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.pexpire(key, REACTION_RATE_WINDOW);
    }

    if (count > MAX_REACTIONS_PER_MINUTE) {
      throw new Error('Reaction rate limit exceeded. Please slow down.');
    }
  }

  /**
   * Get username for a user ID
   */
  private async getUsername(userId: string): Promise<string | undefined> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    return user?.username;
  }

  /**
   * Load reactions from database to Redis (for room initialization)
   */
  async loadReactionsToRedis(roomId: string): Promise<void> {
    const reactions = await prisma.videoReaction.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: REACTIONS_PER_ROOM_LIMIT,
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    if (reactions.length === 0) {
      return;
    }

    const reactionsJson = reactions.map((r: any) =>
      JSON.stringify({
        id: r.id,
        roomId: r.roomId,
        userId: r.userId || undefined,
        username: r.user?.username,
        guestName: r.guestName || undefined,
        emoji: r.emoji,
        position: { x: r.positionX, y: r.positionY },
        mediaTimeMs: r.mediaTimeMs,
        animation: r.animation as AnimationType,
        createdAt: r.createdAt.getTime(),
      })
    );

    // Clear existing and add new
    await redis.del(`room:${roomId}:reactions`);
    if (reactionsJson.length > 0) {
      await redis.lpush(`room:${roomId}:reactions`, ...reactionsJson);
    }
  }
}
