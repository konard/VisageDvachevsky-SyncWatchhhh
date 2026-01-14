import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { roomStateService } from '../../../modules/room/state.service.js';
import { PlaybackState } from '../../types/events.js';

describe('Sync Handler', () => {
  const testRoomId = 'test-room-sync-123';

  beforeEach(async () => {
    await roomStateService.clearRoomState(testRoomId);
  });

  afterEach(async () => {
    await roomStateService.clearRoomState(testRoomId);
  });

  describe('Sequence Numbers', () => {
    it('should increment sequence numbers correctly', async () => {
      const seq1 = await roomStateService.incrementSequenceNumber(testRoomId);
      const seq2 = await roomStateService.incrementSequenceNumber(testRoomId);
      const seq3 = await roomStateService.incrementSequenceNumber(testRoomId);

      expect(seq1).toBe(1);
      expect(seq2).toBe(2);
      expect(seq3).toBe(3);
    });

    it('should get current sequence number', async () => {
      await roomStateService.incrementSequenceNumber(testRoomId);
      await roomStateService.incrementSequenceNumber(testRoomId);

      const current = await roomStateService.getSequenceNumber(testRoomId);
      expect(current).toBe(2);
    });

    it('should return 0 for non-existent room', async () => {
      const seq = await roomStateService.getSequenceNumber('non-existent-room');
      expect(seq).toBe(0);
    });
  });

  describe('Playback State Updates', () => {
    it('should update state with new sequence number on play', async () => {
      const initialState: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-123',
        isPlaying: false,
        playbackRate: 1.0,
        anchorServerTimeMs: 1000,
        anchorMediaTimeMs: 5000,
        sequenceNumber: 0,
      };

      await roomStateService.setPlaybackState(testRoomId, initialState);

      const atServerTime = 2000;
      const sequenceNumber = await roomStateService.incrementSequenceNumber(testRoomId);

      const newState: PlaybackState = {
        ...initialState,
        isPlaying: true,
        anchorServerTimeMs: atServerTime,
        sequenceNumber,
      };

      await roomStateService.setPlaybackState(testRoomId, newState);

      const retrieved = await roomStateService.getPlaybackState(testRoomId);

      expect(retrieved).toEqual(newState);
      expect(retrieved?.isPlaying).toBe(true);
      expect(retrieved?.sequenceNumber).toBe(1);
    });

    it('should calculate media time correctly on pause', async () => {
      const initialState: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: 1000,
        anchorMediaTimeMs: 5000,
        sequenceNumber: 0,
      };

      await roomStateService.setPlaybackState(testRoomId, initialState);

      const atServerTime = 3000; // 2 seconds later
      const timeSinceAnchor = atServerTime - initialState.anchorServerTimeMs;
      const currentMediaTime =
        initialState.anchorMediaTimeMs + timeSinceAnchor * initialState.playbackRate;

      const sequenceNumber = await roomStateService.incrementSequenceNumber(testRoomId);

      const newState: PlaybackState = {
        ...initialState,
        isPlaying: false,
        anchorServerTimeMs: atServerTime,
        anchorMediaTimeMs: currentMediaTime,
        sequenceNumber,
      };

      await roomStateService.setPlaybackState(testRoomId, newState);

      const retrieved = await roomStateService.getPlaybackState(testRoomId);

      expect(retrieved?.isPlaying).toBe(false);
      expect(retrieved?.anchorMediaTimeMs).toBe(7000); // 5000 + 2000
      expect(retrieved?.sequenceNumber).toBe(1);
    });

    it('should update playback rate and recalculate media time', async () => {
      const initialState: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: 1000,
        anchorMediaTimeMs: 5000,
        sequenceNumber: 0,
      };

      await roomStateService.setPlaybackState(testRoomId, initialState);

      const atServerTime = 3000; // 2 seconds later
      const timeSinceAnchor = atServerTime - initialState.anchorServerTimeMs;
      const currentMediaTime =
        initialState.anchorMediaTimeMs + timeSinceAnchor * initialState.playbackRate;

      const newRate = 1.5;
      const sequenceNumber = await roomStateService.incrementSequenceNumber(testRoomId);

      const newState: PlaybackState = {
        ...initialState,
        playbackRate: newRate,
        anchorServerTimeMs: atServerTime,
        anchorMediaTimeMs: currentMediaTime,
        sequenceNumber,
      };

      await roomStateService.setPlaybackState(testRoomId, newState);

      const retrieved = await roomStateService.getPlaybackState(testRoomId);

      expect(retrieved?.playbackRate).toBe(1.5);
      expect(retrieved?.anchorMediaTimeMs).toBe(7000);
      expect(retrieved?.sequenceNumber).toBe(1);
    });

    it('should handle seek by updating anchor points', async () => {
      const initialState: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test-123',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: 1000,
        anchorMediaTimeMs: 5000,
        sequenceNumber: 0,
      };

      await roomStateService.setPlaybackState(testRoomId, initialState);

      const targetMediaTime = 10000;
      const atServerTime = 2000;
      const sequenceNumber = await roomStateService.incrementSequenceNumber(testRoomId);

      const newState: PlaybackState = {
        ...initialState,
        anchorServerTimeMs: atServerTime,
        anchorMediaTimeMs: targetMediaTime,
        sequenceNumber,
      };

      await roomStateService.setPlaybackState(testRoomId, newState);

      const retrieved = await roomStateService.getPlaybackState(testRoomId);

      expect(retrieved?.anchorMediaTimeMs).toBe(10000);
      expect(retrieved?.anchorServerTimeMs).toBe(2000);
      expect(retrieved?.sequenceNumber).toBe(1);
    });
  });

  describe('Sequence Number in Clear State', () => {
    it('should clear sequence number with room state', async () => {
      await roomStateService.incrementSequenceNumber(testRoomId);
      await roomStateService.incrementSequenceNumber(testRoomId);

      const beforeClear = await roomStateService.getSequenceNumber(testRoomId);
      expect(beforeClear).toBe(2);

      await roomStateService.clearRoomState(testRoomId);

      const afterClear = await roomStateService.getSequenceNumber(testRoomId);
      expect(afterClear).toBe(0);
    });
  });
});
