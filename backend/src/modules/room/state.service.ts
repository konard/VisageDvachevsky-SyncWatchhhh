import { stateRedis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { PlaybackState, RoomParticipant } from '../../websocket/types/events.js';

const ROOM_STATE_TTL = 24 * 60 * 60; // 24 hours
const ROOM_PARTICIPANTS_TTL = 24 * 60 * 60; // 24 hours

/**
 * Room State Service
 * Manages room state in Redis for real-time synchronization
 */
export class RoomStateService {
  /**
   * Get playback state for a room
   */
  async getPlaybackState(roomId: string): Promise<PlaybackState | null> {
    try {
      const key = `room:${roomId}:playback`;
      const data = await stateRedis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as PlaybackState;
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get playback state');
      throw error;
    }
  }

  /**
   * Set playback state for a room
   */
  async setPlaybackState(roomId: string, state: PlaybackState): Promise<void> {
    try {
      const key = `room:${roomId}:playback`;
      await stateRedis.setex(key, ROOM_STATE_TTL, JSON.stringify(state));

      logger.debug({ roomId, state }, 'Playback state updated');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to set playback state');
      throw error;
    }
  }

  /**
   * Get participants in a room
   */
  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    try {
      const key = `room:${roomId}:participants`;
      const data = await stateRedis.get(key);

      if (!data) {
        return [];
      }

      return JSON.parse(data) as RoomParticipant[];
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get participants');
      throw error;
    }
  }

  /**
   * Add participant to room
   */
  async addParticipant(roomId: string, participant: RoomParticipant): Promise<void> {
    try {
      const key = `room:${roomId}:participants`;
      const participants = await this.getParticipants(roomId);

      // Check if participant already exists (by oderId)
      const exists = participants.some((p) => p.oderId === participant.oderId);
      if (!exists) {
        participants.push(participant);
        await stateRedis.setex(key, ROOM_PARTICIPANTS_TTL, JSON.stringify(participants));

        logger.debug({ roomId, participant }, 'Participant added');
      }
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to add participant');
      throw error;
    }
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomId: string, oderId: string): Promise<void> {
    try {
      const key = `room:${roomId}:participants`;
      const participants = await this.getParticipants(roomId);

      const filtered = participants.filter((p) => p.oderId !== oderId);
      await stateRedis.setex(key, ROOM_PARTICIPANTS_TTL, JSON.stringify(filtered));

      logger.debug({ roomId, oderId }, 'Participant removed');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to remove participant');
      throw error;
    }
  }

  /**
   * Track online socket for a room
   */
  async addOnlineSocket(roomId: string, socketId: string): Promise<void> {
    try {
      const key = `room:${roomId}:online`;
      await stateRedis.sadd(key, socketId);
      await stateRedis.expire(key, ROOM_STATE_TTL);

      logger.debug({ roomId, socketId }, 'Socket added to online set');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to add online socket');
      throw error;
    }
  }

  /**
   * Remove online socket from room
   */
  async removeOnlineSocket(roomId: string, socketId: string): Promise<void> {
    try {
      const key = `room:${roomId}:online`;
      await stateRedis.srem(key, socketId);

      logger.debug({ roomId, socketId }, 'Socket removed from online set');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to remove online socket');
      throw error;
    }
  }

  /**
   * Get count of online sockets in room
   */
  async getOnlineCount(roomId: string): Promise<number> {
    try {
      const key = `room:${roomId}:online`;
      return await stateRedis.scard(key);
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get online count');
      throw error;
    }
  }

  /**
   * Get and increment sequence number for a room
   */
  async incrementSequenceNumber(roomId: string): Promise<number> {
    try {
      const key = `room:${roomId}:sequence`;
      const sequence = await stateRedis.incr(key);

      // Set TTL if this is the first increment
      if (sequence === 1) {
        await stateRedis.expire(key, ROOM_STATE_TTL);
      }

      logger.debug({ roomId, sequence }, 'Sequence number incremented');
      return sequence;
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to increment sequence number');
      throw error;
    }
  }

  /**
   * Get current sequence number for a room
   */
  async getSequenceNumber(roomId: string): Promise<number> {
    try {
      const key = `room:${roomId}:sequence`;
      const sequence = await stateRedis.get(key);
      return sequence ? parseInt(sequence, 10) : 0;
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get sequence number');
      throw error;
    }
  }

  /**
   * Clear all state for a room
   */
  async clearRoomState(roomId: string): Promise<void> {
    try {
      const keys = [
        `room:${roomId}:playback`,
        `room:${roomId}:participants`,
        `room:${roomId}:online`,
        `room:${roomId}:sequence`,
      ];

      await stateRedis.del(...keys);

      logger.debug({ roomId }, 'Room state cleared');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to clear room state');
      throw error;
    }
  }
}

export const roomStateService = new RoomStateService();
