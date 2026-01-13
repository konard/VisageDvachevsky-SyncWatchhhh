/**
 * Room State Service Integration Tests
 * Tests with real Redis instance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RoomStateService } from '../service.js';
import { PlaybackState } from '@syncwatch/shared';
import Redis from 'ioredis';

// These tests require a running Redis instance
// Skip if REDIS_URL is not set or in CI without Redis
const shouldRunIntegrationTests =
  process.env.REDIS_URL || process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!shouldRunIntegrationTests)('RoomStateService Integration', () => {
  let service: RoomStateService;
  let redis: Redis;
  let redisPub: Redis;
  let redisSub: Redis;

  const testRoomId = `test-integration-${Date.now()}`;

  beforeAll(() => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl);
    redisPub = new Redis(redisUrl);
    redisSub = new Redis(redisUrl);

    service = new RoomStateService(redis, redisPub, redisSub);
  });

  afterAll(async () => {
    await service.cleanup();
    await redis.quit();
    await redisPub.quit();
    await redisSub.quit();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await service.deleteRoomState(testRoomId);
  });

  describe('state persistence', () => {
    it('should persist and retrieve state', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-video',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 5000,
        sequenceNumber: 1,
      };

      await service.setState(state);
      const retrieved = await service.getState(testRoomId);

      expect(retrieved).toEqual(state);
    });

    it('should return null for non-existent state', async () => {
      const retrieved = await service.getState('non-existent-room');
      expect(retrieved).toBeNull();
    });

    it('should respect TTL', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-video',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      // Set with 1 second TTL
      await service.setState(state, 1);

      // Should exist immediately
      let retrieved = await service.getState(testRoomId);
      expect(retrieved).toEqual(state);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      retrieved = await service.getState(testRoomId);
      expect(retrieved).toBeNull();
    });
  });

  describe('sequence number race condition prevention', () => {
    it('should accept updates with increasing sequence numbers', async () => {
      const state1: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'video-1',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      const state2: PlaybackState = {
        ...state1,
        sequenceNumber: 2,
        anchorMediaTimeMs: 1000,
      };

      const state3: PlaybackState = {
        ...state1,
        sequenceNumber: 3,
        anchorMediaTimeMs: 2000,
      };

      const result1 = await service.updateState(state1);
      expect(result1).toBe(true);

      const result2 = await service.updateState(state2);
      expect(result2).toBe(true);

      const result3 = await service.updateState(state3);
      expect(result3).toBe(true);

      const final = await service.getState(testRoomId);
      expect(final?.sequenceNumber).toBe(3);
      expect(final?.anchorMediaTimeMs).toBe(2000);
    });

    it('should reject out-of-order updates', async () => {
      const state1: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'video-1',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 5,
      };

      const state2: PlaybackState = {
        ...state1,
        sequenceNumber: 3, // Older sequence number
        anchorMediaTimeMs: 9999, // Should not be applied
      };

      await service.updateState(state1);
      const result = await service.updateState(state2);

      expect(result).toBe(false);

      const current = await service.getState(testRoomId);
      expect(current?.sequenceNumber).toBe(5);
      expect(current?.anchorMediaTimeMs).toBe(0);
    });
  });

  describe('pub/sub functionality', () => {
    it('should publish and receive state changes', async () => {
      const receivedStates: PlaybackState[] = [];

      const callback = (state: PlaybackState) => {
        receivedStates.push(state);
      };

      await service.subscribe(testRoomId, callback);

      // Give subscription time to register
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-video',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      await service.setState(state);

      // Wait for pub/sub delivery
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedStates).toHaveLength(1);
      expect(receivedStates[0]).toEqual(state);

      await service.unsubscribe(testRoomId, callback);
    });

    it('should support multiple subscribers', async () => {
      const received1: PlaybackState[] = [];
      const received2: PlaybackState[] = [];

      const callback1 = (state: PlaybackState) => received1.push(state);
      const callback2 = (state: PlaybackState) => received2.push(state);

      await service.subscribe(testRoomId, callback1);
      await service.subscribe(testRoomId, callback2);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      await service.setState(state);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);

      await service.unsubscribe(testRoomId, callback1);
      await service.unsubscribe(testRoomId, callback2);
    });

    it('should unsubscribe specific callback', async () => {
      const received1: PlaybackState[] = [];
      const received2: PlaybackState[] = [];

      const callback1 = (state: PlaybackState) => received1.push(state);
      const callback2 = (state: PlaybackState) => received2.push(state);

      await service.subscribe(testRoomId, callback1);
      await service.subscribe(testRoomId, callback2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Unsubscribe callback1 only
      await service.unsubscribe(testRoomId, callback1);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      await service.setState(state);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(received1).toHaveLength(0);
      expect(received2).toHaveLength(1);

      await service.unsubscribe(testRoomId, callback2);
    });
  });

  describe('participant management', () => {
    it('should add and retrieve participants', async () => {
      await service.addParticipant(testRoomId, 'user-1');
      await service.addParticipant(testRoomId, 'user-2');
      await service.addParticipant(testRoomId, 'user-3');

      const participants = await service.getParticipants(testRoomId);

      expect(participants).toHaveLength(3);
      expect(participants).toContain('user-1');
      expect(participants).toContain('user-2');
      expect(participants).toContain('user-3');
    });

    it('should remove participants', async () => {
      await service.addParticipant(testRoomId, 'user-1');
      await service.addParticipant(testRoomId, 'user-2');

      await service.removeParticipant(testRoomId, 'user-1');

      const participants = await service.getParticipants(testRoomId);

      expect(participants).toHaveLength(1);
      expect(participants).toContain('user-2');
      expect(participants).not.toContain('user-1');
    });

    it('should handle duplicate participants', async () => {
      await service.addParticipant(testRoomId, 'user-1');
      await service.addParticipant(testRoomId, 'user-1');

      const participants = await service.getParticipants(testRoomId);

      // Sets don't allow duplicates
      expect(participants).toHaveLength(1);
    });
  });

  describe('online socket management', () => {
    it('should track online sockets', async () => {
      await service.addOnlineSocket(testRoomId, 'socket-1');
      await service.addOnlineSocket(testRoomId, 'socket-2');

      const sockets = await service.getOnlineSockets(testRoomId);
      const count = await service.getOnlineCount(testRoomId);

      expect(sockets).toHaveLength(2);
      expect(count).toBe(2);
    });

    it('should remove online sockets', async () => {
      await service.addOnlineSocket(testRoomId, 'socket-1');
      await service.addOnlineSocket(testRoomId, 'socket-2');

      await service.removeOnlineSocket(testRoomId, 'socket-1');

      const sockets = await service.getOnlineSockets(testRoomId);
      const count = await service.getOnlineCount(testRoomId);

      expect(sockets).toHaveLength(1);
      expect(sockets).toContain('socket-2');
      expect(count).toBe(1);
    });
  });

  describe('state recovery', () => {
    it('should recover existing state', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'upload',
        sourceId: 'video-123',
        isPlaying: true,
        playbackRate: 1.5,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 12345,
        sequenceNumber: 42,
      };

      await service.setState(state);
      const recovered = await service.recoverState(testRoomId);

      expect(recovered).toEqual(state);
    });

    it('should return null when no state to recover', async () => {
      const recovered = await service.recoverState('non-existent-room');
      expect(recovered).toBeNull();
    });
  });

  describe('room cleanup', () => {
    it('should delete all room data', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      await service.setState(state);
      await service.addParticipant(testRoomId, 'user-1');
      await service.addOnlineSocket(testRoomId, 'socket-1');

      await service.deleteRoomState(testRoomId);

      const retrievedState = await service.getState(testRoomId);
      const participants = await service.getParticipants(testRoomId);
      const sockets = await service.getOnlineSockets(testRoomId);

      expect(retrievedState).toBeNull();
      expect(participants).toHaveLength(0);
      expect(sockets).toHaveLength(0);
    });
  });

  describe('TTL refresh', () => {
    it('should refresh TTL on all keys', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      await service.setState(state, 2); // 2 seconds
      await service.addParticipant(testRoomId, 'user-1', 2);
      await service.addOnlineSocket(testRoomId, 'socket-1', 2);

      // Refresh to 10 seconds
      await service.refreshTTL(testRoomId, 10);

      // Wait 3 seconds (past original TTL)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Data should still exist
      const retrievedState = await service.getState(testRoomId);
      expect(retrievedState).not.toBeNull();
    }, 15000); // Increase test timeout
  });
});
