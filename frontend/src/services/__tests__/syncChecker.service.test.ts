import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncCheckerService } from '../syncChecker.service';
import { PlaybackState } from '@syncwatch/shared';
import { PlayerControls } from '../../stores/playback.store';

// Mock player
const createMockPlayer = (currentTime = 0, isPlaying = false): PlayerControls => ({
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setPlaybackRate: vi.fn(),
  getCurrentTime: vi.fn(() => currentTime),
  getDuration: vi.fn(() => 100),
  isPlaying: vi.fn(() => isPlaying),
});

describe('SyncCheckerService', () => {
  let service: SyncCheckerService;
  let player: PlayerControls;

  beforeEach(() => {
    service = new SyncCheckerService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  describe('checkSync', () => {
    it('should return synced status when drift is within tolerance', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: now - 5000,
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(5.0, true); // 5 seconds, matches expected

      const result = service.checkSync(state, player, 0);

      expect(result.status).toBe('synced');
      expect(result.action).toBe('none');
      expect(Math.abs(result.drift)).toBeLessThan(300);
    });

    it('should return syncing status when drift requires soft sync', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: now - 5000,
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(5.4, true); // 400ms ahead

      const result = service.checkSync(state, player, 0);

      expect(result.status).toBe('syncing');
      expect(result.action).toBe('soft_sync');
      expect(result.drift).toBeCloseTo(400, -1);
    });

    it('should return drifted status when drift requires hard sync', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: now - 5000,
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(6.0, true); // 1 second ahead

      const result = service.checkSync(state, player, 0);

      expect(result.status).toBe('drifted');
      expect(result.action).toBe('hard_sync');
      expect(result.drift).toBeCloseTo(1000, -1);
    });

    it('should detect when player is behind', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: now - 5000,
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(4.5, true); // 500ms behind

      const result = service.checkSync(state, player, 0);

      expect(result.drift).toBeCloseTo(-500, -1);
      expect(result.action).toBe('hard_sync');
    });
  });

  describe('applySync', () => {
    it('should not change rate when sync is good', () => {
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(0, true);

      const result = {
        drift: 100,
        status: 'synced' as const,
        action: 'none' as const,
      };

      service.applySync(result, state, player);

      expect(player.setPlaybackRate).not.toHaveBeenCalled();
      expect(player.seek).not.toHaveBeenCalled();
    });

    it('should apply soft sync by adjusting playback rate when ahead', () => {
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(0, true);

      const result = {
        drift: 400, // Ahead
        status: 'syncing' as const,
        action: 'soft_sync' as const,
      };

      service.applySync(result, state, player);

      // Should slow down (rate < 1.0)
      expect(player.setPlaybackRate).toHaveBeenCalled();
      const calledRate = (player.setPlaybackRate as any).mock.calls[0][0];
      expect(calledRate).toBeLessThan(1.0);
    });

    it('should apply soft sync by adjusting playback rate when behind', () => {
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(0, true);

      const result = {
        drift: -400, // Behind
        status: 'syncing' as const,
        action: 'soft_sync' as const,
      };

      service.applySync(result, state, player);

      // Should speed up (rate > 1.0)
      expect(player.setPlaybackRate).toHaveBeenCalled();
      const calledRate = (player.setPlaybackRate as any).mock.calls[0][0];
      expect(calledRate).toBeGreaterThan(1.0);
    });

    it('should apply hard sync by seeking', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: now - 5000,
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(4, true); // 1 second behind

      const result = {
        drift: -1000,
        status: 'drifted' as const,
        action: 'hard_sync' as const,
      };

      service.applySync(result, state, player);

      expect(player.seek).toHaveBeenCalled();
      expect(player.setPlaybackRate).toHaveBeenCalledWith(1.0);
    });

    it('should not apply soft sync when paused', () => {
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      player = createMockPlayer(0, false);

      const result = {
        drift: 400,
        status: 'syncing' as const,
        action: 'soft_sync' as const,
      };

      service.applySync(result, state, player);

      expect(player.setPlaybackRate).not.toHaveBeenCalled();
    });
  });
});
