import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { usePlaybackStore } from '../stores/playback.store';

/**
 * Configuration for clock synchronization
 */
interface ClockSyncConfig {
  /** Number of ping-pong samples to average */
  sampleCount?: number;
  /** Interval between sync attempts in milliseconds */
  syncInterval?: number;
  /** Whether to start syncing immediately */
  autoStart?: boolean;
}

/**
 * Hook to synchronize client clock with server clock
 * Uses ping-pong method to calculate offset and compensate for network latency
 */
export function useClockSync(
  socket: Socket | null,
  config: ClockSyncConfig = {}
) {
  const {
    sampleCount = 5,
    syncInterval = 30000, // 30 seconds
    autoStart = true,
  } = config;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const setClockOffset = usePlaybackStore((state) => state.setClockOffset);
  const clockOffset = usePlaybackStore((state) => state.clockOffset);

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const samplesRef = useRef<number[]>([]);

  /**
   * Perform a single ping-pong measurement
   */
  const performSingleSync = async (): Promise<number | null> => {
    if (!socket || !socket.connected) {
      return null;
    }

    return new Promise((resolve) => {
      const clientSendTime = Date.now();

      const timeout = setTimeout(() => {
        socket.off('time:pong', handlePong);
        resolve(null);
      }, 5000);

      const handlePong = (data: { clientTime: number; serverTime: number }) => {
        clearTimeout(timeout);
        const clientReceiveTime = Date.now();

        // Calculate round-trip time
        const rtt = clientReceiveTime - data.clientTime;

        // Estimate server time when we received the response
        // Server time + half of round-trip time
        const estimatedServerTime = data.serverTime + rtt / 2;

        // Calculate offset (how much to add to local time to get server time)
        const offset = estimatedServerTime - clientReceiveTime;

        resolve(offset);
      };

      socket.once('time:pong', handlePong);
      socket.emit('time:ping', { clientTime: clientSendTime });
    });
  };

  /**
   * Perform full clock synchronization with multiple samples
   */
  const syncClock = async () => {
    if (!socket || !socket.connected || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    samplesRef.current = [];

    try {
      // Collect multiple samples
      for (let i = 0; i < sampleCount; i++) {
        const offset = await performSingleSync();
        if (offset !== null) {
          samplesRef.current.push(offset);
        }
        // Small delay between samples
        if (i < sampleCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (samplesRef.current.length === 0) {
        throw new Error('Failed to get any sync samples');
      }

      // Calculate median offset (more robust than mean)
      const sortedSamples = [...samplesRef.current].sort((a, b) => a - b);
      const medianOffset =
        sortedSamples.length % 2 === 0
          ? (sortedSamples[sortedSamples.length / 2 - 1] +
              sortedSamples[sortedSamples.length / 2]) /
            2
          : sortedSamples[Math.floor(sortedSamples.length / 2)];

      setClockOffset(medianOffset);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSyncError(message);
      console.error('Clock sync error:', message);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Schedule next sync
   */
  const scheduleNextSync = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncClock();
    }, syncInterval);
  };

  // Auto-sync on mount and when socket connects
  useEffect(() => {
    if (autoStart && socket && socket.connected) {
      syncClock();
    }
  }, [socket?.connected, autoStart]);

  // Set up periodic syncing
  useEffect(() => {
    if (!socket || !socket.connected) {
      return;
    }

    scheduleNextSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [socket?.connected, syncInterval]);

  return {
    clockOffset,
    isSyncing,
    syncError,
    syncClock,
  };
}
