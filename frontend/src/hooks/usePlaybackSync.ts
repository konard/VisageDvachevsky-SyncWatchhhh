import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { SyncCommand, PlaybackState } from '@syncwatch/shared';
import { usePlaybackStore, PlayerControls } from '../stores/playback.store';
import { SyncExecutorService } from '../services/syncExecutor.service';
import { SyncCheckerService } from '../services/syncChecker.service';
import { useClockSync } from './useClockSync';

/**
 * Configuration for playback synchronization
 */
interface PlaybackSyncConfig {
  /** Interval for checking sync drift in milliseconds */
  checkInterval?: number;
  /** Whether to enable automatic sync checking */
  autoSync?: boolean;
  /** Whether to enable automatic clock synchronization */
  enableClockSync?: boolean;
}

/**
 * Main hook for managing playback synchronization
 * Handles incoming sync commands and periodic drift checking
 * Integrates clock synchronization for accurate timing
 */
export function usePlaybackSync(
  socket: Socket | null,
  player: PlayerControls | null,
  config: PlaybackSyncConfig = {}
) {
  const { checkInterval = 1000, autoSync = true, enableClockSync = true } = config;

  // Store references
  const {
    playbackState,
    syncStatus,
    drift,
    clockOffset: storedClockOffset,
    setPlaybackState,
    setSyncStatus,
    setDrift,
    setPlayerControls,
    setClockOffset,
  } = usePlaybackStore();

  // Clock synchronization hook
  const {
    offset: clockOffset,
    synced: clockSynced,
    rtt,
    syncing: clockSyncing,
    getServerTime,
  } = useClockSync(socket, {
    autoSync: enableClockSync,
    sampleCount: 5,
    delayMs: 100,
    resyncInterval: 30000, // Re-sync every 30 seconds
  });

  // Service instances
  const executorRef = useRef<SyncExecutorService>();
  const checkerRef = useRef<SyncCheckerService>();
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize services
  useEffect(() => {
    if (!executorRef.current) {
      executorRef.current = new SyncExecutorService();
    }
    if (!checkerRef.current) {
      checkerRef.current = new SyncCheckerService();
    }

    return () => {
      executorRef.current?.destroy();
      checkerRef.current?.destroy();
    };
  }, []);

  // Update clock offset in store when it changes
  useEffect(() => {
    if (clockSynced) {
      setClockOffset(clockOffset);
    }
  }, [clockOffset, clockSynced, setClockOffset]);

  // Update player controls in store
  useEffect(() => {
    setPlayerControls(player);
  }, [player, setPlayerControls]);

  /**
   * Handle incoming sync command from server
   */
  const handleSyncCommand = useCallback((command: SyncCommand) => {
    if (!player || !executorRef.current) {
      console.warn('Received sync command but player is not ready');
      return;
    }

    if (command.type === 'STATE_SNAPSHOT') {
      // Update playback state
      setPlaybackState(command.state);
      setSyncStatus('syncing');
    } else {
      // Execute the command using the current clock offset
      const currentOffset = storedClockOffset || 0;
      executorRef.current.executeCommand(command, player, currentOffset);
    }
  }, [player, storedClockOffset, setPlaybackState, setSyncStatus]);

  /**
   * Handle playback state update from server
   */
  const handleSyncState = useCallback((state: PlaybackState) => {
    setPlaybackState(state);
    setSyncStatus('syncing');
  }, [setPlaybackState, setSyncStatus]);

  /**
   * Perform periodic sync check
   */
  const performSyncCheck = useCallback(() => {
    if (!player || !playbackState || !checkerRef.current) {
      return;
    }

    try {
      // Use stored clock offset for sync checking
      const currentOffset = storedClockOffset || 0;

      // Check current sync status
      const result = checkerRef.current.checkSync(
        playbackState,
        player,
        currentOffset
      );

      // Update store
      setDrift(result.drift);
      setSyncStatus(result.status);

      // Apply correction if needed
      if (autoSync) {
        checkerRef.current.applySync(result, playbackState, player);
      }
    } catch (error) {
      console.error('Error during sync check:', error);
      setSyncStatus('error');
    }
  }, [player, playbackState, storedClockOffset, autoSync, setDrift, setSyncStatus]);

  /**
   * Manually trigger a hard sync
   */
  const forceSync = useCallback(() => {
    if (!player || !playbackState || !checkerRef.current) {
      return;
    }

    try {
      const currentOffset = storedClockOffset || 0;
      const result = checkerRef.current.checkSync(
        playbackState,
        player,
        currentOffset
      );

      // Force hard sync regardless of drift
      checkerRef.current.applySync(
        { ...result, action: 'hard_sync' },
        playbackState,
        player
      );

      setSyncStatus('syncing');
    } catch (error) {
      console.error('Error during force sync:', error);
      setSyncStatus('error');
    }
  }, [player, playbackState, storedClockOffset, setSyncStatus]);

  /**
   * Request a fresh state snapshot from the server
   */
  const requestResync = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('sync:resync', {});
    }
  }, [socket]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on('sync:command', handleSyncCommand);
    socket.on('sync:state', handleSyncState);

    return () => {
      socket.off('sync:command', handleSyncCommand);
      socket.off('sync:state', handleSyncState);
    };
  }, [socket, handleSyncCommand, handleSyncState]);

  // Set up periodic sync checking
  useEffect(() => {
    if (!player || !playbackState || !autoSync) {
      return;
    }

    // Initial check
    performSyncCheck();

    // Set up interval
    syncIntervalRef.current = setInterval(performSyncCheck, checkInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [player, playbackState, autoSync, checkInterval, performSyncCheck]);

  return {
    playbackState,
    syncStatus,
    drift,
    clockOffset: storedClockOffset,
    clockSynced,
    clockRtt: rtt,
    clockSyncing,
    forceSync,
    requestResync,
    getServerTime,
  };
}
