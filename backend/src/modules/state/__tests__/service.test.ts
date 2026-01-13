/**
 * Room State Service Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoomStateService, REDIS_KEYS } from '../service.js';
import { PlaybackState } from '@syncwatch/shared';
import type Redis from 'ioredis';

// Mock Redis clients
const createMockRedis = (): Partial<Redis> => ({
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  scard: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn(),
});

describe('RoomStateService', () => {
  let service: RoomStateService;
  let mockRedis: Partial<Redis>;
  let mockPub: Partial<Redis>;
  let mockSub: Partial<Redis>;

  const testRoomId = 'test-room-123';
  const testState: PlaybackState = {
    roomId: testRoomId,
    sourceType: 'youtube',
    sourceId: 'dQw4w9WgXcQ',
    isPlaying: true,
    playbackRate: 1.0,
    anchorServerTimeMs: Date.now(),
    anchorMediaTimeMs: 30000,
    sequenceNumber: 1,
  };

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockPub = createMockRedis();
    mockSub = createMockRedis();

    service = new RoomStateService(
      mockRedis as Redis,
      mockPub as Redis,
      mockSub as Redis
    );
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('REDIS_KEYS', () => {
    it('should generate correct key patterns', () => {
      expect(REDIS_KEYS.roomState('abc123')).toBe('room:abc123:state');
      expect(REDIS_KEYS.roomParticipants('abc123')).toBe('room:abc123:participants');
      expect(REDIS_KEYS.roomOnline('abc123')).toBe('room:abc123:online');
      expect(REDIS_KEYS.roomEvents('abc123')).toBe('room:abc123:events');
    });
  });

  describe('getState', () => {
    it('should return null when no state exists', async () => {
      vi.mocked(mockRedis.get!).mockResolvedValue(null);

      const result = await service.getState(testRoomId);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(REDIS_KEYS.roomState(testRoomId));
    });

    it('should return parsed state when data exists', async () => {
      vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(testState));

      const result = await service.getState(testRoomId);

      expect(result).toEqual(testState);
    });

    it('should throw error when state data is invalid', async () => {
      vi.mocked(mockRedis.get!).mockResolvedValue('invalid json');

      await expect(service.getState(testRoomId)).rejects.toThrow('Invalid state data in Redis');
    });

    it('should throw error when state data fails validation', async () => {
      const invalidState = { ...testState, sourceType: 'invalid' };
      vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(invalidState));

      await expect(service.getState(testRoomId)).rejects.toThrow('Invalid state data in Redis');
    });
  });

  describe('setState', () => {
    it('should set state with default TTL', async () => {
      vi.mocked(mockRedis.setex!).mockResolvedValue('OK');
      vi.mocked(mockPub.publish!).mockResolvedValue(0);

      await service.setState(testState);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        REDIS_KEYS.roomState(testRoomId),
        24 * 60 * 60,
        JSON.stringify(testState)
      );
      expect(mockPub.publish).toHaveBeenCalledWith(
        REDIS_KEYS.roomEvents(testRoomId),
        JSON.stringify(testState)
      );
    });

    it('should set state with custom TTL', async () => {
      vi.mocked(mockRedis.setex!).mockResolvedValue('OK');
      vi.mocked(mockPub.publish!).mockResolvedValue(0);

      const customTTL = 3600;
      await service.setState(testState, customTTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        REDIS_KEYS.roomState(testRoomId),
        customTTL,
        JSON.stringify(testState)
      );
    });

    it('should throw error for invalid state', async () => {
      const invalidState = { ...testState, roomId: '' };

      await expect(service.setState(invalidState)).rejects.toThrow('Invalid roomId');
    });
  });

  describe('updateState', () => {
    it('should accept new state when no current state exists', async () => {
      vi.mocked(mockRedis.get!).mockResolvedValue(null);
      vi.mocked(mockRedis.setex!).mockResolvedValue('OK');
      vi.mocked(mockPub.publish!).mockResolvedValue(0);

      const result = await service.updateState(testState);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should accept update with newer sequence number', async () => {
      const oldState = { ...testState, sequenceNumber: 5 };
      const newState = { ...testState, sequenceNumber: 10 };

      vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(oldState));
      vi.mocked(mockRedis.setex!).mockResolvedValue('OK');
      vi.mocked(mockPub.publish!).mockResolvedValue(0);

      const result = await service.updateState(newState);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should reject update with older sequence number', async () => {
      const oldState = { ...testState, sequenceNumber: 10 };
      const newState = { ...testState, sequenceNumber: 5 };

      vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(oldState));

      const result = await service.updateState(newState);

      expect(result).toBe(false);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should reject update with equal sequence number', async () => {
      const oldState = { ...testState, sequenceNumber: 10 };
      const newState = { ...testState, sequenceNumber: 10 };

      vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(oldState));

      const result = await service.updateState(newState);

      expect(result).toBe(false);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('participant management', () => {
    const participantId = 'user-123';

    it('should add participant with TTL', async () => {
      vi.mocked(mockRedis.sadd!).mockResolvedValue(1);
      vi.mocked(mockRedis.expire!).mockResolvedValue(1);

      await service.addParticipant(testRoomId, participantId);

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        REDIS_KEYS.roomParticipants(testRoomId),
        participantId
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        REDIS_KEYS.roomParticipants(testRoomId),
        24 * 60 * 60
      );
    });

    it('should remove participant', async () => {
      vi.mocked(mockRedis.srem!).mockResolvedValue(1);

      await service.removeParticipant(testRoomId, participantId);

      expect(mockRedis.srem).toHaveBeenCalledWith(
        REDIS_KEYS.roomParticipants(testRoomId),
        participantId
      );
    });

    it('should get all participants', async () => {
      const participants = ['user-1', 'user-2', 'user-3'];
      vi.mocked(mockRedis.smembers!).mockResolvedValue(participants);

      const result = await service.getParticipants(testRoomId);

      expect(result).toEqual(participants);
      expect(mockRedis.smembers).toHaveBeenCalledWith(
        REDIS_KEYS.roomParticipants(testRoomId)
      );
    });
  });

  describe('online socket management', () => {
    const socketId = 'socket-abc123';

    it('should add online socket with TTL', async () => {
      vi.mocked(mockRedis.sadd!).mockResolvedValue(1);
      vi.mocked(mockRedis.expire!).mockResolvedValue(1);

      await service.addOnlineSocket(testRoomId, socketId);

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        REDIS_KEYS.roomOnline(testRoomId),
        socketId
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        REDIS_KEYS.roomOnline(testRoomId),
        24 * 60 * 60
      );
    });

    it('should remove online socket', async () => {
      vi.mocked(mockRedis.srem!).mockResolvedValue(1);

      await service.removeOnlineSocket(testRoomId, socketId);

      expect(mockRedis.srem).toHaveBeenCalledWith(
        REDIS_KEYS.roomOnline(testRoomId),
        socketId
      );
    });

    it('should get all online sockets', async () => {
      const sockets = ['socket-1', 'socket-2'];
      vi.mocked(mockRedis.smembers!).mockResolvedValue(sockets);

      const result = await service.getOnlineSockets(testRoomId);

      expect(result).toEqual(sockets);
    });

    it('should get online count', async () => {
      vi.mocked(mockRedis.scard!).mockResolvedValue(3);

      const result = await service.getOnlineCount(testRoomId);

      expect(result).toBe(3);
      expect(mockRedis.scard).toHaveBeenCalledWith(REDIS_KEYS.roomOnline(testRoomId));
    });
  });

  describe('createSnapshot', () => {
    it('should create valid snapshot with current server time', () => {
      const beforeTime = Date.now();

      const snapshot = service.createSnapshot(
        testRoomId,
        'youtube',
        'video-id',
        true,
        60000,
        1.5,
        42
      );

      const afterTime = Date.now();

      expect(snapshot).toEqual({
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'video-id',
        isPlaying: true,
        playbackRate: 1.5,
        anchorServerTimeMs: expect.any(Number),
        anchorMediaTimeMs: 60000,
        sequenceNumber: 42,
      });

      expect(snapshot.anchorServerTimeMs).toBeGreaterThanOrEqual(beforeTime);
      expect(snapshot.anchorServerTimeMs).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('calculateCurrentMediaTime', () => {
    it('should return anchor time when paused', () => {
      const pausedState: PlaybackState = {
        ...testState,
        isPlaying: false,
        anchorMediaTimeMs: 5000,
      };

      const result = service.calculateCurrentMediaTime(pausedState);

      expect(result).toBe(5000);
    });

    it('should calculate time based on elapsed server time when playing', () => {
      const baseTime = Date.now();
      const playingState: PlaybackState = {
        ...testState,
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: baseTime,
        anchorMediaTimeMs: 0,
      };

      const currentTime = baseTime + 5000; // 5 seconds later
      const result = service.calculateCurrentMediaTime(playingState, currentTime);

      expect(result).toBe(5000);
    });

    it('should account for playback rate', () => {
      const baseTime = Date.now();
      const playingState: PlaybackState = {
        ...testState,
        isPlaying: true,
        playbackRate: 2.0,
        anchorServerTimeMs: baseTime,
        anchorMediaTimeMs: 1000,
      };

      const currentTime = baseTime + 1000; // 1 second later
      const result = service.calculateCurrentMediaTime(playingState, currentTime);

      expect(result).toBe(3000); // 1000 + (1000 * 2.0)
    });

    it('should use current time when not provided', () => {
      const recentTime = Date.now() - 100;
      const playingState: PlaybackState = {
        ...testState,
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: recentTime,
        anchorMediaTimeMs: 0,
      };

      const result = service.calculateCurrentMediaTime(playingState);

      expect(result).toBeGreaterThan(90);
      expect(result).toBeLessThan(200);
    });
  });

  describe('recoverState', () => {
    it('should return current state for recovery', async () => {
      vi.mocked(mockRedis.get!).mockResolvedValue(JSON.stringify(testState));

      const result = await service.recoverState(testRoomId);

      expect(result).toEqual(testState);
    });

    it('should return null when no state to recover', async () => {
      vi.mocked(mockRedis.get!).mockResolvedValue(null);

      const result = await service.recoverState(testRoomId);

      expect(result).toBeNull();
    });
  });

  describe('deleteRoomState', () => {
    it('should delete all room keys', async () => {
      vi.mocked(mockRedis.del!).mockResolvedValue(3);

      await service.deleteRoomState(testRoomId);

      expect(mockRedis.del).toHaveBeenCalledWith(
        REDIS_KEYS.roomState(testRoomId),
        REDIS_KEYS.roomParticipants(testRoomId),
        REDIS_KEYS.roomOnline(testRoomId)
      );
    });
  });

  describe('refreshTTL', () => {
    it('should refresh TTL for all room keys', async () => {
      vi.mocked(mockRedis.expire!).mockResolvedValue(1);

      const customTTL = 7200;
      await service.refreshTTL(testRoomId, customTTL);

      expect(mockRedis.expire).toHaveBeenCalledTimes(3);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        REDIS_KEYS.roomState(testRoomId),
        customTTL
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        REDIS_KEYS.roomParticipants(testRoomId),
        customTTL
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        REDIS_KEYS.roomOnline(testRoomId),
        customTTL
      );
    });
  });

  describe('state validation', () => {
    it('should reject state with empty roomId', async () => {
      const invalid = { ...testState, roomId: '' };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid roomId');
    });

    it('should reject state with invalid sourceType', async () => {
      const invalid = { ...testState, sourceType: 'invalid' as PlaybackState['sourceType'] };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid sourceType');
    });

    it('should reject state with empty sourceId', async () => {
      const invalid = { ...testState, sourceId: '' };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid sourceId');
    });

    it('should reject state with non-boolean isPlaying', async () => {
      const invalid = { ...testState, isPlaying: 'true' as unknown as boolean };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid isPlaying');
    });

    it('should reject state with invalid playbackRate', async () => {
      const invalid = { ...testState, playbackRate: 0 };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid playbackRate');
    });

    it('should reject state with negative anchorServerTimeMs', async () => {
      const invalid = { ...testState, anchorServerTimeMs: -1 };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid anchorServerTimeMs');
    });

    it('should reject state with negative anchorMediaTimeMs', async () => {
      const invalid = { ...testState, anchorMediaTimeMs: -1 };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid anchorMediaTimeMs');
    });

    it('should reject state with negative sequenceNumber', async () => {
      const invalid = { ...testState, sequenceNumber: -1 };
      await expect(service.setState(invalid)).rejects.toThrow('Invalid sequenceNumber');
    });

    it('should accept all valid sourceTypes', async () => {
      vi.mocked(mockRedis.setex!).mockResolvedValue('OK');
      vi.mocked(mockPub.publish!).mockResolvedValue(0);

      const sourceTypes: Array<'upload' | 'youtube' | 'external'> = [
        'upload',
        'youtube',
        'external',
      ];

      for (const sourceType of sourceTypes) {
        const state = { ...testState, sourceType };
        await expect(service.setState(state)).resolves.not.toThrow();
      }
    });
  });
});
