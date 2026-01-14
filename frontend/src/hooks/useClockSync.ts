import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { ClockSync } from '../lib/ClockSync';

/**
 * Configuration options for useClockSync hook
 */
export interface UseClockSyncOptions {
  /**
   * Number of samples to take during sync (default: 5)
   */
  sampleCount?: number;

  /**
   * Delay between samples in milliseconds (default: 100)
   */
  delayMs?: number;

  /**
   * Interval for periodic re-sync in milliseconds (default: 30000 = 30s)
   * Set to 0 to disable periodic re-sync
   */
  resyncInterval?: number;

  /**
   * Whether to sync automatically when the socket connects (default: true)
   */
  autoSync?: boolean;
}

/**
 * Return type for useClockSync hook
 */
export interface UseClockSyncReturn {
  /**
   * Clock offset in milliseconds
   */
  offset: number;

  /**
   * Whether the clock is synced
   */
  synced: boolean;

  /**
   * Average round-trip time in milliseconds
   */
  rtt: number;

  /**
   * Whether a sync is currently in progress
   */
  syncing: boolean;

  /**
   * Error if sync failed
   */
  error: Error | null;

  /**
   * Get the current server time
   */
  getServerTime: () => number;

  /**
   * Manually trigger a sync
   */
  sync: () => Promise<void>;

  /**
   * Reset the clock sync state
   */
  reset: () => void;
}

/**
 * React hook for clock synchronization
 *
 * This hook manages the clock synchronization state and provides
 * a convenient interface for syncing the client's clock with the server.
 *
 * Features:
 * - Automatic sync on connection
 * - Periodic re-sync to maintain accuracy
 * - Manual sync trigger
 * - Error handling
 *
 * @param socket - Socket.io client socket (can be null if not connected)
 * @param options - Configuration options
 * @returns Clock sync state and methods
 *
 * @example
 * ```tsx
 * const { offset, synced, rtt, getServerTime } = useClockSync(socket, {
 *   sampleCount: 5,
 *   resyncInterval: 30000,
 * });
 *
 * // Get server time
 * const serverTime = getServerTime();
 * ```
 */
export function useClockSync(
  socket: Socket | null,
  options: UseClockSyncOptions = {}
): UseClockSyncReturn {
  const {
    sampleCount = 5,
    delayMs = 100,
    resyncInterval = 30000,
    autoSync = true,
  } = options;

  const [offset, setOffset] = useState(0);
  const [synced, setSynced] = useState(false);
  const [rtt, setRtt] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clockSyncRef = useRef<ClockSync>(new ClockSync());
  const resyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Perform clock synchronization
   */
  const sync = useCallback(async () => {
    if (!socket || !socket.connected) {
      const err = new Error('Socket not connected');
      setError(err);
      return;
    }

    if (syncing) {
      return;
    }

    try {
      setSyncing(true);
      setError(null);

      const calculatedOffset = await clockSyncRef.current.sync(socket, sampleCount, delayMs);

      if (!isMountedRef.current) return;

      setOffset(calculatedOffset);
      setRtt(clockSyncRef.current.getRtt());
      setSynced(true);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Sync failed');
      setError(error);
      setSynced(false);
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [socket, sampleCount, delayMs, syncing]);

  /**
   * Get server time
   */
  const getServerTime = useCallback((): number => {
    return clockSyncRef.current.getServerTime();
  }, []);

  /**
   * Reset clock sync
   */
  const reset = useCallback(() => {
    clockSyncRef.current.reset();
    setOffset(0);
    setSynced(false);
    setRtt(0);
    setError(null);
  }, []);

  /**
   * Setup periodic re-sync
   */
  useEffect(() => {
    if (!socket || !synced || resyncInterval <= 0) {
      return;
    }

    // Clear existing timer
    if (resyncTimerRef.current) {
      clearInterval(resyncTimerRef.current);
    }

    // Setup periodic re-sync
    resyncTimerRef.current = setInterval(() => {
      sync();
    }, resyncInterval);

    return () => {
      if (resyncTimerRef.current) {
        clearInterval(resyncTimerRef.current);
        resyncTimerRef.current = null;
      }
    };
  }, [socket, synced, resyncInterval, sync]);

  /**
   * Auto-sync when socket connects
   */
  useEffect(() => {
    if (!socket || !autoSync) {
      return;
    }

    const handleConnect = () => {
      sync();
    };

    const handleDisconnect = () => {
      reset();
    };

    // If already connected, sync immediately
    if (socket.connected) {
      sync();
    }

    // Listen for connection events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, autoSync, sync, reset]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (resyncTimerRef.current) {
        clearInterval(resyncTimerRef.current);
      }
    };
  }, []);

  return {
    offset,
    synced,
    rtt,
    syncing,
    error,
    getServerTime,
    sync,
    reset,
  };
}
