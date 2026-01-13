/**
 * Room State Service
 * Manages real-time room playback state using Redis
 */

import { PlaybackState } from '@syncwatch/shared';
import { redis, redisPub, redisSub } from '../../database/redis.js';
import { BadRequestError, NotFoundError } from '../../common/errors/index.js';
import type Redis from 'ioredis';

/**
 * Redis key patterns for room state management
 */
export const REDIS_KEYS = {
  roomState: (roomId: string) => `room:${roomId}:state`,
  roomParticipants: (roomId: string) => `room:${roomId}:participants`,
  roomOnline: (roomId: string) => `room:${roomId}:online`,
  roomEvents: (roomId: string) => `room:${roomId}:events`,
} as const;

/**
 * Default TTL for room state (24 hours in seconds)
 */
const DEFAULT_STATE_TTL = 24 * 60 * 60;

/**
 * Room State Service
 * Handles playback state persistence, pub/sub, and participant tracking
 */
export class RoomStateService {
  private subscriptions: Map<string, ((state: PlaybackState) => void)[]> = new Map();

  constructor(
    private redisClient: Redis = redis,
    private pubClient: Redis = redisPub,
    private subClient: Redis = redisSub
  ) {
    // Set up message handler for subscriptions
    this.subClient.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });
  }

  /**
   * Get current playback state for a room
   */
  async getState(roomId: string): Promise<PlaybackState | null> {
    const key = REDIS_KEYS.roomState(roomId);
    const data = await this.redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      const state = JSON.parse(data) as PlaybackState;
      this.validateState(state);
      return state;
    } catch (error) {
      throw new BadRequestError('Invalid state data in Redis', {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Set playback state for a room with TTL
   */
  async setState(state: PlaybackState, ttlSeconds: number = DEFAULT_STATE_TTL): Promise<void> {
    this.validateState(state);

    const key = REDIS_KEYS.roomState(state.roomId);
    const data = JSON.stringify(state);

    // Set state with TTL and publish change event
    await Promise.all([
      this.redisClient.setex(key, ttlSeconds, data),
      this.publishStateChange(state),
    ]);
  }

  /**
   * Update state with sequence number validation to prevent race conditions
   * Returns true if update succeeded, false if rejected due to stale sequence number
   */
  async updateState(
    newState: PlaybackState,
    ttlSeconds: number = DEFAULT_STATE_TTL
  ): Promise<boolean> {
    this.validateState(newState);

    const currentState = await this.getState(newState.roomId);

    // If no current state exists, accept the new state
    if (!currentState) {
      await this.setState(newState, ttlSeconds);
      return true;
    }

    // Reject updates with older or equal sequence numbers
    if (newState.sequenceNumber <= currentState.sequenceNumber) {
      return false;
    }

    // Accept update with newer sequence number
    await this.setState(newState, ttlSeconds);
    return true;
  }

  /**
   * Publish state change event to room subscribers
   */
  private async publishStateChange(state: PlaybackState): Promise<void> {
    const channel = REDIS_KEYS.roomEvents(state.roomId);
    const message = JSON.stringify(state);
    await this.pubClient.publish(channel, message);
  }

  /**
   * Subscribe to state changes for a room
   */
  async subscribe(roomId: string, callback: (state: PlaybackState) => void): Promise<void> {
    const channel = REDIS_KEYS.roomEvents(roomId);

    // Add callback to subscriptions map
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
      // Subscribe to channel if first subscription
      await this.subClient.subscribe(channel);
    }

    this.subscriptions.get(channel)!.push(callback);
  }

  /**
   * Unsubscribe from state changes for a room
   */
  async unsubscribe(roomId: string, callback?: (state: PlaybackState) => void): Promise<void> {
    const channel = REDIS_KEYS.roomEvents(roomId);
    const callbacks = this.subscriptions.get(channel);

    if (!callbacks) {
      return;
    }

    if (callback) {
      // Remove specific callback
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      // Remove all callbacks
      callbacks.length = 0;
    }

    // Unsubscribe from channel if no callbacks left
    if (callbacks.length === 0) {
      this.subscriptions.delete(channel);
      await this.subClient.unsubscribe(channel);
    }
  }

  /**
   * Handle incoming messages from Redis pub/sub
   */
  private handleMessage(channel: string, message: string): void {
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks) {
      return;
    }

    try {
      const state = JSON.parse(message) as PlaybackState;
      callbacks.forEach((callback) => callback(state));
    } catch (error) {
      console.error('Error parsing state message:', error);
    }
  }

  /**
   * Add participant to room
   */
  async addParticipant(
    roomId: string,
    participantId: string,
    ttlSeconds: number = DEFAULT_STATE_TTL
  ): Promise<void> {
    const key = REDIS_KEYS.roomParticipants(roomId);
    await this.redisClient.sadd(key, participantId);
    await this.redisClient.expire(key, ttlSeconds);
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(roomId: string, participantId: string): Promise<void> {
    const key = REDIS_KEYS.roomParticipants(roomId);
    await this.redisClient.srem(key, participantId);
  }

  /**
   * Get all participants in a room
   */
  async getParticipants(roomId: string): Promise<string[]> {
    const key = REDIS_KEYS.roomParticipants(roomId);
    return await this.redisClient.smembers(key);
  }

  /**
   * Add online socket connection to room
   */
  async addOnlineSocket(
    roomId: string,
    socketId: string,
    ttlSeconds: number = DEFAULT_STATE_TTL
  ): Promise<void> {
    const key = REDIS_KEYS.roomOnline(roomId);
    await this.redisClient.sadd(key, socketId);
    await this.redisClient.expire(key, ttlSeconds);
  }

  /**
   * Remove online socket connection from room
   */
  async removeOnlineSocket(roomId: string, socketId: string): Promise<void> {
    const key = REDIS_KEYS.roomOnline(roomId);
    await this.redisClient.srem(key, socketId);
  }

  /**
   * Get all online sockets in a room
   */
  async getOnlineSockets(roomId: string): Promise<string[]> {
    const key = REDIS_KEYS.roomOnline(roomId);
    return await this.redisClient.smembers(key);
  }

  /**
   * Get count of online sockets in a room
   */
  async getOnlineCount(roomId: string): Promise<number> {
    const key = REDIS_KEYS.roomOnline(roomId);
    return await this.redisClient.scard(key);
  }

  /**
   * Create a state snapshot with current server time
   */
  createSnapshot(
    roomId: string,
    sourceType: PlaybackState['sourceType'],
    sourceId: string,
    isPlaying: boolean,
    currentMediaTimeMs: number,
    playbackRate: number = 1.0,
    sequenceNumber: number
  ): PlaybackState {
    return {
      roomId,
      sourceType,
      sourceId,
      isPlaying,
      playbackRate,
      anchorServerTimeMs: Date.now(),
      anchorMediaTimeMs: currentMediaTimeMs,
      sequenceNumber,
    };
  }

  /**
   * Recover state for a reconnecting client
   * Returns the current state or null if no state exists
   */
  async recoverState(roomId: string): Promise<PlaybackState | null> {
    return await this.getState(roomId);
  }

  /**
   * Calculate current media time based on state snapshot and server time
   */
  calculateCurrentMediaTime(state: PlaybackState, currentServerTimeMs?: number): number {
    const serverTime = currentServerTimeMs ?? Date.now();

    if (!state.isPlaying) {
      return state.anchorMediaTimeMs;
    }

    const elapsedMs = serverTime - state.anchorServerTimeMs;
    const mediaProgress = elapsedMs * state.playbackRate;
    return state.anchorMediaTimeMs + mediaProgress;
  }

  /**
   * Delete all state for a room
   */
  async deleteRoomState(roomId: string): Promise<void> {
    const keys = [
      REDIS_KEYS.roomState(roomId),
      REDIS_KEYS.roomParticipants(roomId),
      REDIS_KEYS.roomOnline(roomId),
    ];

    await this.redisClient.del(...keys);

    // Unsubscribe all listeners
    await this.unsubscribe(roomId);
  }

  /**
   * Refresh TTL for room state
   */
  async refreshTTL(roomId: string, ttlSeconds: number = DEFAULT_STATE_TTL): Promise<void> {
    const keys = [
      REDIS_KEYS.roomState(roomId),
      REDIS_KEYS.roomParticipants(roomId),
      REDIS_KEYS.roomOnline(roomId),
    ];

    await Promise.all(keys.map((key) => this.redisClient.expire(key, ttlSeconds)));
  }

  /**
   * Validate PlaybackState structure
   */
  private validateState(state: PlaybackState): void {
    if (!state.roomId || typeof state.roomId !== 'string') {
      throw new BadRequestError('Invalid roomId');
    }

    if (!['upload', 'youtube', 'external'].includes(state.sourceType)) {
      throw new BadRequestError('Invalid sourceType');
    }

    if (!state.sourceId || typeof state.sourceId !== 'string') {
      throw new BadRequestError('Invalid sourceId');
    }

    if (typeof state.isPlaying !== 'boolean') {
      throw new BadRequestError('Invalid isPlaying');
    }

    if (typeof state.playbackRate !== 'number' || state.playbackRate <= 0) {
      throw new BadRequestError('Invalid playbackRate');
    }

    if (typeof state.anchorServerTimeMs !== 'number' || state.anchorServerTimeMs < 0) {
      throw new BadRequestError('Invalid anchorServerTimeMs');
    }

    if (typeof state.anchorMediaTimeMs !== 'number' || state.anchorMediaTimeMs < 0) {
      throw new BadRequestError('Invalid anchorMediaTimeMs');
    }

    if (typeof state.sequenceNumber !== 'number' || state.sequenceNumber < 0) {
      throw new BadRequestError('Invalid sequenceNumber');
    }
  }

  /**
   * Clean up all subscriptions and connections
   */
  async cleanup(): Promise<void> {
    // Unsubscribe from all channels
    const channels = Array.from(this.subscriptions.keys());
    if (channels.length > 0) {
      await this.subClient.unsubscribe(...channels);
    }
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const roomStateService = new RoomStateService();
