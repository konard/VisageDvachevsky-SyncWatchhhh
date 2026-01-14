import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlaybackSync } from '../usePlaybackSync';
import { SyncCommand, PlaybackState } from '@syncwatch/shared';

// Mock services
const mockExecuteCommand = vi.fn();
const mockCheckSync = vi.fn();
const mockApplySync = vi.fn();
const mockDestroy = vi.fn();

vi.mock('../services/syncExecutor.service', () => ({
  SyncExecutorService: vi.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand,
    destroy: mockDestroy,
  })),
}));

vi.mock('../services/syncChecker.service', () => ({
  SyncCheckerService: vi.fn().mockImplementation(() => ({
    checkSync: mockCheckSync,
    applySync: mockApplySync,
    destroy: mockDestroy,
  })),
}));

// Mock store
const mockSetPlaybackState = vi.fn();
const mockSetSyncStatus = vi.fn();
const mockSetDrift = vi.fn();
const mockSetPlayerControls = vi.fn();

vi.mock('../stores/playback.store', () => ({
  usePlaybackStore: () => ({
    playbackState: null,
    syncStatus: 'synced',
    drift: 0,
    clockOffset: 0,
    setPlaybackState: mockSetPlaybackState,
    setSyncStatus: mockSetSyncStatus,
    setDrift: mockSetDrift,
    setPlayerControls: mockSetPlayerControls,
  }),
}));

describe('usePlaybackSync', () => {
  let mockSocket: any;
  let mockPlayer: any;
  let eventListeners: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    eventListeners = new Map();

    mockSocket = {
      connected: true,
      on: vi.fn((event, handler) => {
        eventListeners.set(event, handler);
      }),
      off: vi.fn((event, handler) => {
        eventListeners.delete(event);
      }),
      emit: vi.fn(),
    };

    mockPlayer = {
      play: vi.fn(),
      pause: vi.fn(),
      seekTo: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(0),
      getDuration: vi.fn().mockReturnValue(100),
      getPlaybackRate: vi.fn().mockReturnValue(1),
      setPlaybackRate: vi.fn(),
    };

    mockCheckSync.mockReturnValue({
      drift: 0,
      status: 'synced',
      action: 'none',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize services', () => {
    const { result } = renderHook(() =>
      usePlaybackSync(mockSocket, mockPlayer)
    );

    expect(result.current).toMatchObject({
      playbackState: null,
      syncStatus: 'synced',
      drift: 0,
    });
  });

  it('should set up socket event listeners', () => {
    renderHook(() => usePlaybackSync(mockSocket, mockPlayer));

    expect(mockSocket.on).toHaveBeenCalledWith('sync:command', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('sync:state', expect.any(Function));
  });

  it('should handle sync command', () => {
    renderHook(() => usePlaybackSync(mockSocket, mockPlayer));

    const command: SyncCommand = {
      type: 'PLAY',
      timestamp: Date.now(),
      userId: 'user-1',
    };

    const handler = eventListeners.get('sync:command');
    act(() => {
      handler!(command);
    });

    expect(mockExecuteCommand).toHaveBeenCalledWith(
      command,
      mockPlayer,
      expect.any(Number)
    );
  });

  it('should handle state snapshot command', () => {
    renderHook(() => usePlaybackSync(mockSocket, mockPlayer));

    const state: PlaybackState = {
      isPlaying: true,
      currentTime: 10,
      lastUpdateTime: Date.now(),
      playbackRate: 1,
    };

    const command: SyncCommand = {
      type: 'STATE_SNAPSHOT',
      timestamp: Date.now(),
      userId: 'user-1',
      state,
    };

    const handler = eventListeners.get('sync:command');
    act(() => {
      handler!(command);
    });

    expect(mockSetPlaybackState).toHaveBeenCalledWith(state);
    expect(mockSetSyncStatus).toHaveBeenCalledWith('syncing');
  });

  it('should handle sync state update', () => {
    renderHook(() => usePlaybackSync(mockSocket, mockPlayer));

    const state: PlaybackState = {
      isPlaying: false,
      currentTime: 20,
      lastUpdateTime: Date.now(),
      playbackRate: 1,
    };

    const handler = eventListeners.get('sync:state');
    act(() => {
      handler!(state);
    });

    expect(mockSetPlaybackState).toHaveBeenCalledWith(state);
    expect(mockSetSyncStatus).toHaveBeenCalledWith('syncing');
  });

  it('should not handle command when player is not ready', () => {
    renderHook(() => usePlaybackSync(mockSocket, null));

    const command: SyncCommand = {
      type: 'PLAY',
      timestamp: Date.now(),
      userId: 'user-1',
    };

    const handler = eventListeners.get('sync:command');
    act(() => {
      handler!(command);
    });

    expect(mockExecuteCommand).not.toHaveBeenCalled();
  });

  it('should update player controls when player changes', () => {
    const { rerender } = renderHook(
      ({ player }) => usePlaybackSync(mockSocket, player),
      {
        initialProps: { player: null },
      }
    );

    expect(mockSetPlayerControls).toHaveBeenCalledWith(null);

    rerender({ player: mockPlayer });

    expect(mockSetPlayerControls).toHaveBeenCalledWith(mockPlayer);
  });

  it('should perform force sync', () => {
    const { result } = renderHook(() =>
      usePlaybackSync(mockSocket, mockPlayer)
    );

    act(() => {
      result.current.forceSync();
    });

    expect(mockCheckSync).toHaveBeenCalled();
    expect(mockApplySync).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() =>
      usePlaybackSync(mockSocket, mockPlayer)
    );

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('sync:command', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('sync:state', expect.any(Function));
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should disable auto sync when configured', () => {
    renderHook(() =>
      usePlaybackSync(mockSocket, mockPlayer, { autoSync: false })
    );

    vi.advanceTimersByTime(5000);

    // Should not apply sync automatically
    expect(mockApplySync).not.toHaveBeenCalled();
  });

  it('should handle sync check errors gracefully', () => {
    mockCheckSync.mockImplementation(() => {
      throw new Error('Sync check failed');
    });

    renderHook(() => usePlaybackSync(mockSocket, mockPlayer));

    // Advance timer to trigger sync check
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockSetSyncStatus).toHaveBeenCalledWith('error');
  });
});
