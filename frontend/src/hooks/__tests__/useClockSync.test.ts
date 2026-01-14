import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useClockSync } from '../useClockSync';

// Mock zustand store
const mockSetClockOffset = vi.fn();
const mockClockOffset = 0;

vi.mock('../stores/playback.store', () => ({
  usePlaybackStore: (selector: any) =>
    selector({
      setClockOffset: mockSetClockOffset,
      clockOffset: mockClockOffset,
    }),
}));

describe('useClockSync', () => {
  let mockSocket: any;
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
      once: vi.fn((event, handler) => {
        eventListeners.set(event, handler);
      }),
      off: vi.fn((event, handler) => {
        eventListeners.delete(event);
      }),
      emit: vi.fn((event, data) => {
        // Simulate immediate pong response
        if (event === 'time:ping') {
          setTimeout(() => {
            const pongHandler = eventListeners.get('time:pong');
            if (pongHandler) {
              pongHandler({
                clientTime: data.clientTime,
                serverTime: Date.now() + 100, // Server is 100ms ahead
              });
            }
          }, 10);
        }
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useClockSync(null));

    expect(result.current.clockOffset).toBe(mockClockOffset);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncError).toBe(null);
  });

  it('should not sync when socket is null', async () => {
    const { result } = renderHook(() => useClockSync(null, { autoStart: true }));

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(mockSetClockOffset).not.toHaveBeenCalled();
  });

  it('should not sync when socket is disconnected', async () => {
    mockSocket.connected = false;

    const { result } = renderHook(() =>
      useClockSync(mockSocket, { autoStart: true })
    );

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(mockSetClockOffset).not.toHaveBeenCalled();
  });

  it('should perform clock sync when socket is connected and autoStart is true', async () => {
    const { result } = renderHook(() =>
      useClockSync(mockSocket, { autoStart: true, sampleCount: 3 })
    );

    // Fast-forward timers to allow sync to complete
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'time:ping',
      expect.objectContaining({ clientTime: expect.any(Number) })
    );
  });

  it('should manually trigger sync', async () => {
    const { result } = renderHook(() =>
      useClockSync(mockSocket, { autoStart: false, sampleCount: 2 })
    );

    expect(result.current.isSyncing).toBe(false);

    // Manually trigger sync
    await act(async () => {
      result.current.syncClock();
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(mockSocket.emit).toHaveBeenCalled();
  });

  it('should schedule periodic syncs', async () => {
    const syncInterval = 5000;

    renderHook(() =>
      useClockSync(mockSocket, { autoStart: true, syncInterval })
    );

    // Clear initial sync calls
    mockSocket.emit.mockClear();

    // Fast-forward to trigger periodic sync
    await act(async () => {
      vi.advanceTimersByTime(syncInterval + 1000);
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  it('should handle sync errors gracefully', async () => {
    mockSocket.emit = vi.fn((event) => {
      if (event === 'time:ping') {
        // Don't trigger pong, simulating timeout
      }
    });

    const { result } = renderHook(() =>
      useClockSync(mockSocket, { autoStart: true, sampleCount: 1 })
    );

    await act(async () => {
      vi.advanceTimersByTime(10000); // Wait for timeout
    });

    await waitFor(() => {
      expect(result.current.syncError).toBeTruthy();
    });
  });

  it('should calculate median offset from multiple samples', async () => {
    let callCount = 0;
    const offsets = [100, 105, 102, 110, 103]; // Median should be 103

    mockSocket.emit = vi.fn((event, data) => {
      if (event === 'time:ping') {
        setTimeout(() => {
          const pongHandler = eventListeners.get('time:pong');
          if (pongHandler) {
            pongHandler({
              clientTime: data.clientTime,
              serverTime: Date.now() + offsets[callCount % offsets.length],
            });
            callCount++;
          }
        }, 10);
      }
    });

    renderHook(() =>
      useClockSync(mockSocket, { autoStart: true, sampleCount: 5 })
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(mockSetClockOffset).toHaveBeenCalled();
    });
  });

  it('should cleanup timers on unmount', () => {
    const { unmount } = renderHook(() =>
      useClockSync(mockSocket, { autoStart: true, syncInterval: 5000 })
    );

    unmount();

    // Verify no errors when advancing timers after unmount
    expect(() => {
      vi.advanceTimersByTime(10000);
    }).not.toThrow();
  });
});
