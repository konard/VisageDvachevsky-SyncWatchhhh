import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaybackStore } from '../playback.store';
import { PlaybackState, SyncCommand } from '@syncwatch/shared';

describe('usePlaybackStore', () => {
  beforeEach(() => {
    // Reset store before each test
    usePlaybackStore.getState().reset();
  });

  it('should have correct initial state', () => {
    const state = usePlaybackStore.getState();

    expect(state.playbackState).toBeNull();
    expect(state.syncStatus).toBe('syncing');
    expect(state.drift).toBe(0);
    expect(state.commandBuffer).toEqual([]);
    expect(state.playerControls).toBeNull();
    expect(state.clockOffset).toBe(0);
  });

  it('should set playback state', () => {
    const playbackState: PlaybackState = {
      roomId: 'test-room',
      sourceType: 'youtube',
      sourceId: 'abc123',
      isPlaying: true,
      playbackRate: 1.0,
      anchorServerTimeMs: Date.now(),
      anchorMediaTimeMs: 0,
      sequenceNumber: 1,
    };

    usePlaybackStore.getState().setPlaybackState(playbackState);

    expect(usePlaybackStore.getState().playbackState).toEqual(playbackState);
  });

  it('should set sync status', () => {
    usePlaybackStore.getState().setSyncStatus('synced');
    expect(usePlaybackStore.getState().syncStatus).toBe('synced');

    usePlaybackStore.getState().setSyncStatus('drifted');
    expect(usePlaybackStore.getState().syncStatus).toBe('drifted');
  });

  it('should set drift and update last sync check time', () => {
    const before = Date.now();
    usePlaybackStore.getState().setDrift(150);
    const after = Date.now();

    const state = usePlaybackStore.getState();
    expect(state.drift).toBe(150);
    expect(state.lastSyncCheck).toBeGreaterThanOrEqual(before);
    expect(state.lastSyncCheck).toBeLessThanOrEqual(after);
  });

  it('should set clock offset', () => {
    usePlaybackStore.getState().setClockOffset(250);
    expect(usePlaybackStore.getState().clockOffset).toBe(250);
  });

  it('should add command to buffer', () => {
    const command: SyncCommand = {
      type: 'PLAY',
      atServerTime: Date.now(),
      sequenceNumber: 1,
    };

    usePlaybackStore.getState().addCommandToBuffer(command, Date.now() + 1000);

    const buffer = usePlaybackStore.getState().commandBuffer;
    expect(buffer).toHaveLength(1);
    expect(buffer[0].command).toEqual(command);
  });

  it('should remove command from buffer by index', () => {
    const command1: SyncCommand = {
      type: 'PLAY',
      atServerTime: Date.now(),
      sequenceNumber: 1,
    };
    const command2: SyncCommand = {
      type: 'PAUSE',
      atServerTime: Date.now(),
      sequenceNumber: 2,
    };

    const store = usePlaybackStore.getState();
    store.addCommandToBuffer(command1, Date.now() + 1000);
    store.addCommandToBuffer(command2, Date.now() + 2000);

    expect(usePlaybackStore.getState().commandBuffer).toHaveLength(2);

    store.removeCommandFromBuffer(0);

    const buffer = usePlaybackStore.getState().commandBuffer;
    expect(buffer).toHaveLength(1);
    expect(buffer[0].command).toEqual(command2);
  });

  it('should clear command buffer', () => {
    const command: SyncCommand = {
      type: 'PLAY',
      atServerTime: Date.now(),
      sequenceNumber: 1,
    };

    const store = usePlaybackStore.getState();
    store.addCommandToBuffer(command, Date.now() + 1000);
    store.addCommandToBuffer(command, Date.now() + 2000);

    expect(usePlaybackStore.getState().commandBuffer).toHaveLength(2);

    store.clearCommandBuffer();

    expect(usePlaybackStore.getState().commandBuffer).toEqual([]);
  });

  it('should reset to initial state', () => {
    const playbackState: PlaybackState = {
      roomId: 'test-room',
      sourceType: 'youtube',
      sourceId: 'abc123',
      isPlaying: true,
      playbackRate: 1.0,
      anchorServerTimeMs: Date.now(),
      anchorMediaTimeMs: 0,
      sequenceNumber: 1,
    };

    const store = usePlaybackStore.getState();
    store.setPlaybackState(playbackState);
    store.setSyncStatus('synced');
    store.setDrift(100);
    store.setClockOffset(50);

    store.reset();

    const state = usePlaybackStore.getState();
    expect(state.playbackState).toBeNull();
    expect(state.syncStatus).toBe('syncing');
    expect(state.drift).toBe(0);
    expect(state.clockOffset).toBe(0);
    expect(state.commandBuffer).toEqual([]);
  });
});
