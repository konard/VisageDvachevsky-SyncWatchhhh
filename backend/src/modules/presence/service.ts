/**
 * Presence Service
 * Handles user presence, online status, and rich presence features
 */

import { redis, redisPub } from '../../database/redis.js';
import { prisma } from '../../common/utils/prisma.js';
import { FriendsService } from '../friends/service.js';
import {
  UserPresence,
  RichPresence,
  PresenceStatus,
  FriendInRoom,
} from './types.js';

const PRESENCE_TTL = 300; // 5 minutes
const RICH_PRESENCE_TTL = 300; // 5 minutes

export class PresenceService {
  private friendsService: FriendsService;

  constructor() {
    this.friendsService = new FriendsService();
  }

  /**
   * Update user's presence status
   */
  async updatePresence(userId: string, status: PresenceStatus): Promise<void> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const actualStatus = status;
    const visibleStatus = settings?.invisibleMode ? 'offline' : status;

    // Store actual presence in Redis
    const presence: UserPresence = {
      userId,
      status: actualStatus,
      lastSeenAt: Date.now(),
    };

    await redis.hset(`presence:${userId}`, {
      status: actualStatus,
      lastSeenAt: presence.lastSeenAt.toString(),
    });
    await redis.expire(`presence:${userId}`, PRESENCE_TTL);

    // Publish presence update to friends with visible status
    await this.broadcastPresenceToFriends(userId, {
      userId,
      status: visibleStatus as PresenceStatus,
      lastSeenAt: presence.lastSeenAt,
    });
  }

  /**
   * Update user's current room and activity
   */
  async updateRoomPresence(
    userId: string,
    roomId: string | null,
    activity: string | null
  ): Promise<void> {
    if (roomId && activity) {
      await redis.hset(`presence:${userId}`, {
        currentRoomId: roomId,
        currentActivity: activity,
      });
    } else {
      await redis.hdel(`presence:${userId}`, 'currentRoomId', 'currentActivity');
    }
    await redis.expire(`presence:${userId}`, PRESENCE_TTL);

    // Broadcast update to friends
    const presence = await this.getPresence(userId);
    if (presence) {
      await this.broadcastPresenceToFriends(userId, presence);
    }
  }

  /**
   * Get user's presence
   */
  async getPresence(userId: string): Promise<UserPresence | null> {
    const data = await redis.hgetall(`presence:${userId}`);

    if (!data || !data.status) {
      return {
        userId,
        status: 'offline',
        lastSeenAt: 0,
      };
    }

    return {
      userId,
      status: data.status as PresenceStatus,
      lastSeenAt: parseInt(data.lastSeenAt || '0', 10),
      currentRoomId: data.currentRoomId,
      currentActivity: data.currentActivity,
    };
  }

  /**
   * Get presence for a user, respecting invisible mode
   */
  async getPresenceForUser(targetId: string, _requesterId: string): Promise<UserPresence> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId: targetId },
    });

    if (settings?.invisibleMode) {
      return {
        userId: targetId,
        status: 'offline',
        lastSeenAt: 0,
      };
    }

    const presence = await this.getPresence(targetId);
    return (
      presence || {
        userId: targetId,
        status: 'offline',
        lastSeenAt: 0,
      }
    );
  }

  /**
   * Get presence for multiple users
   */
  async getPresenceBatch(userIds: string[]): Promise<Map<string, UserPresence>> {
    const presenceMap = new Map<string, UserPresence>();

    await Promise.all(
      userIds.map(async (userId) => {
        const presence = await this.getPresence(userId);
        if (presence) {
          presenceMap.set(userId, presence);
        }
      })
    );

    return presenceMap;
  }

  /**
   * Update rich presence for a user in a room
   */
  async updateRichPresence(userId: string, roomId: string): Promise<void> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        video: true,
        participants: true,
      },
    });

    if (!room) {
      return;
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Don't broadcast rich presence if invisible or disabled
    if (settings?.invisibleMode || !settings?.showRichPresence) {
      return;
    }

    // Determine video title
    let videoTitle = 'Video';
    let thumbnailUrl: string | undefined;

    if (room.video) {
      videoTitle = room.video.filename;
      // thumbnailUrl could be extracted from video metadata if available
    } else if (room.youtubeVideoId) {
      videoTitle = `YouTube Video`;
      thumbnailUrl = `https://img.youtube.com/vi/${room.youtubeVideoId}/default.jpg`;
    }

    const richPresence: RichPresence = {
      userId,
      activity: 'Watching',
      details: videoTitle,
      timestamp: Date.now(),
      partySize: room.participants.length,
      partyMax: room.maxParticipants,
      thumbnailUrl,
      joinable: room.participants.length < room.maxParticipants && (settings?.allowFriendJoin ?? true),
      roomCode: settings?.allowFriendJoin ? room.code : undefined,
    };

    // Store rich presence
    await redis.hset(`presence:${userId}:rich`, richPresence as any);
    await redis.expire(`presence:${userId}:rich`, RICH_PRESENCE_TTL);

    // Broadcast to friends
    await this.broadcastRichPresenceToFriends(userId, richPresence);
  }

  /**
   * Clear rich presence for a user
   */
  async clearRichPresence(userId: string): Promise<void> {
    await redis.del(`presence:${userId}:rich`);

    // Notify friends
    const friends = await this.friendsService.getFriends(userId);
    for (const friend of friends) {
      await redisPub.publish(
        `user:${friend.id}:presence`,
        JSON.stringify({
          type: 'rich_presence_cleared',
          userId,
        })
      );
    }
  }

  /**
   * Get rich presence for a user
   */
  async getRichPresence(userId: string): Promise<RichPresence | null> {
    const data = await redis.hgetall(`presence:${userId}:rich`);

    if (!data || !data.userId) {
      return null;
    }

    return {
      userId: data.userId,
      activity: data.activity,
      details: data.details,
      timestamp: parseInt(data.timestamp || '0', 10),
      partySize: data.partySize ? parseInt(data.partySize, 10) : undefined,
      partyMax: data.partyMax ? parseInt(data.partyMax, 10) : undefined,
      thumbnailUrl: data.thumbnailUrl,
      joinable: data.joinable === 'true',
      roomCode: data.roomCode,
    };
  }

  /**
   * Get friends currently in rooms
   */
  async getFriendsInRooms(userId: string): Promise<FriendInRoom[]> {
    const friends = await this.friendsService.getFriends(userId);
    const result: FriendInRoom[] = [];

    for (const friend of friends) {
      const presence = await this.getPresenceForUser(friend.id, userId);

      if (presence.currentRoomId && presence.status !== 'invisible' && presence.status !== 'offline') {
        const room = await prisma.room.findUnique({
          where: { id: presence.currentRoomId },
          include: { participants: true },
        });

        if (room && room.participants.length < room.maxParticipants) {
          const friendSettings = await prisma.userSettings.findUnique({
            where: { userId: friend.id },
          });

          if (friendSettings?.allowFriendJoin) {
            result.push({
              friendId: friend.id,
              username: friend.username,
              avatarUrl: friend.avatarUrl,
              roomId: room.id,
              roomCode: room.code,
              roomName: room.name,
              activity: presence.currentActivity || 'Watching',
              participantCount: room.participants.length,
              maxParticipants: room.maxParticipants,
              joinable: true,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Set invisible mode for a user
   */
  async setInvisibleMode(userId: string, enabled: boolean): Promise<void> {
    await prisma.userSettings.update({
      where: { userId },
      data: { invisibleMode: enabled },
    });

    if (enabled) {
      // Broadcast offline status to friends
      await this.broadcastPresenceToFriends(userId, {
        userId,
        status: 'offline',
        lastSeenAt: Date.now(),
      });
    } else {
      // Broadcast actual presence
      const presence = await this.getPresence(userId);
      if (presence) {
        await this.broadcastPresenceToFriends(userId, presence);
      }
    }
  }

  /**
   * Broadcast presence update to all friends
   */
  private async broadcastPresenceToFriends(
    userId: string,
    presence: UserPresence
  ): Promise<void> {
    const friends = await this.friendsService.getFriends(userId);

    for (const friend of friends) {
      await redisPub.publish(
        `user:${friend.id}:presence`,
        JSON.stringify({
          type: 'presence_updated',
          userId,
          presence,
        })
      );
    }
  }

  /**
   * Broadcast rich presence update to all friends
   */
  private async broadcastRichPresenceToFriends(
    userId: string,
    richPresence: RichPresence
  ): Promise<void> {
    const friends = await this.friendsService.getFriends(userId);

    for (const friend of friends) {
      await redisPub.publish(
        `user:${friend.id}:presence`,
        JSON.stringify({
          type: 'rich_presence_updated',
          userId,
          richPresence,
        })
      );
    }
  }

  /**
   * Clean up presence when user disconnects
   */
  async cleanup(userId: string): Promise<void> {
    await this.updatePresence(userId, 'offline');
    await this.clearRichPresence(userId);
  }
}
