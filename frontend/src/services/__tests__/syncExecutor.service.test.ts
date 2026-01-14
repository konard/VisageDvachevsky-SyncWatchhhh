import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncExecutorService } from '../syncExecutor.service';
import { SyncCommand, PlaybackState } from '@syncwatch/shared';
import { PlayerControls } from '../../stores/playback.store';

// Mock player
const createMockPlayer = (): PlayerControls => ({
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setPlaybackRate: vi.fn(),
  getCurrentTime: vi.fn(() => 0),
  getDuration: vi.fn(() => 100),
  isPlaying: vi.fn(() => false),
});

describe('SyncExecutorService', () => {
  let service: SyncExecutorService;
  let player: PlayerControls;

  beforeEach(() => {
    service = new SyncExecutorService();
    player = createMockPlayer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  describe('executeCommand', () => {
    it('should execute PLAY command immediately when in the past', () => {
      const command: SyncCommand = {
        type: 'PLAY',
        atServerTime: Date.now() - 100,
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, 0);

      expect(player.play).toHaveBeenCalled();
    });

    it('should execute PAUSE command immediately', () => {
      (player.isPlaying as any).mockReturnValue(true);
      const command: SyncCommand = {
        type: 'PAUSE',
        atServerTime: Date.now(),
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, 0);

      expect(player.pause).toHaveBeenCalled();
    });

    it('should execute SEEK command with correct time in seconds', () => {
      const command: SyncCommand = {
        type: 'SEEK',
        targetMediaTime: 5000, // 5 seconds in ms
        atServerTime: Date.now(),
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, 0);

      expect(player.seek).toHaveBeenCalledWith(5); // Converted to seconds
    });

    it('should execute SET_RATE command', () => {
      const command: SyncCommand = {
        type: 'SET_RATE',
        rate: 1.5,
        atServerTime: Date.now(),
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, 0);

      expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });

    it('should schedule future commands', () => {
      const futureTime = Date.now() + 1000;
      const command: SyncCommand = {
        type: 'PLAY',
        atServerTime: futureTime,
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, 0);

      // Should not execute immediately
      expect(player.play).not.toHaveBeenCalled();

      // Advance time
      vi.advanceTimersByTime(1000);

      // Should execute after delay
      expect(player.play).toHaveBeenCalled();
    });

    it('should account for clock offset when scheduling', () => {
      const clockOffset = 500;
      const serverTime = Date.now() + clockOffset + 1000;
      const command: SyncCommand = {
        type: 'PLAY',
        atServerTime: serverTime,
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, clockOffset);

      // Should not execute immediately
      expect(player.play).not.toHaveBeenCalled();

      // Advance time
      vi.advanceTimersByTime(1000);

      // Should execute after adjusted delay
      expect(player.play).toHaveBeenCalled();
    });

    it('should not execute STATE_SNAPSHOT commands', () => {
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

      const command: SyncCommand = {
        type: 'STATE_SNAPSHOT',
        state,
      };

      service.executeCommand(command, player, 0);

      expect(player.play).not.toHaveBeenCalled();
      expect(player.pause).not.toHaveBeenCalled();
      expect(player.seek).not.toHaveBeenCalled();
    });
  });

  describe('calculateExpectedPosition', () => {
    it('should return anchor time when paused', () => {
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 5000,
        sequenceNumber: 1,
      };

      const position = service.calculateExpectedPosition(state, 0);

      expect(position).toBe(5000);
    });

    it('should calculate position when playing', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: now - 2000, // 2 seconds ago
        anchorMediaTimeMs: 1000, // Started at 1 second
        sequenceNumber: 1,
      };

      const position = service.calculateExpectedPosition(state, 0);

      // Should be approximately 3000ms (1000 + 2000)
      expect(position).toBeCloseTo(3000, -2);
    });

    it('should account for playback rate', () => {
      const now = Date.now();
      const state: PlaybackState = {
        roomId: 'test',
        sourceType: 'youtube',
        sourceId: 'abc123',
        isPlaying: true,
        playbackRate: 2.0,
        anchorServerTimeMs: now - 1000, // 1 second ago
        anchorMediaTimeMs: 1000,
        sequenceNumber: 1,
      };

      const position = service.calculateExpectedPosition(state, 0);

      // Should be approximately 3000ms (1000 + 1000 * 2.0)
      expect(position).toBeCloseTo(3000, -2);
    });
  });

  describe('clearScheduledCommands', () => {
    it('should clear all scheduled commands', () => {
      const futureTime = Date.now() + 1000;
      const command: SyncCommand = {
        type: 'PLAY',
        atServerTime: futureTime,
        sequenceNumber: 1,
      };

      service.executeCommand(command, player, 0);
      service.clearScheduledCommands();

      // Advance time
      vi.advanceTimersByTime(1000);

      // Should not execute
      expect(player.play).not.toHaveBeenCalled();
    });
  });
});
