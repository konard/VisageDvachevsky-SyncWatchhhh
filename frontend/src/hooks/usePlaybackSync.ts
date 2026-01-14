import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SyncCommand, PlaybackState } from '@syncwatch/shared';
import { usePlaybackStore, PlayerControls } from '../stores/playback.store';
import { SyncExecutorService } from '../services/syncExecutor.service';
import { SyncCheckerService } from '../services/syncChecker.service';

/**
 * Configuration for playback synchronization
 */
interface PlaybackSyncConfig {
  /** Interval for checking sync drift in milliseconds */
  checkInterval?: number;
  /** Whether to enable automatic sync checking */
  autoSync?: boolean;
}

/**
 * Main hook for managing playback synchronization
 * Handles incoming sync commands and periodic drift checking
 */
export function usePlaybackSync(
  socket: Socket | null,
  player: PlayerControls | null,
  config: PlaybackSyncConfig = {}
) {
  const { checkInterval = 1000, autoSync = true } = config;

  // Store references
  const {
    playbackState,
    syncStatus,
    drift,
    clockOffset,
    setPlaybackState,
    setSyncStatus,
    setDrift,
    setPlayerControls,
  } = usePlaybackStore();

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

  // Update player controls in store
  useEffect(() => {
    setPlayerControls(player);
  }, [player, setPlayerControls]);

  /**
   * Handle incoming sync command from server
   */
  const handleSyncCommand = (command: SyncCommand) => {
    if (!player || !executorRef.current) {
      console.warn('Received sync command but player is not ready');
      return;
    }

    if (command.type === 'STATE_SNAPSHOT') {
      // Update playback state
      setPlaybackState(command.state);
      setSyncStatus('syncing');
    } else {
      // Execute the command
      executorRef.current.executeCommand(command, player, clockOffset);
    }
  };

  /**
   * Handle playback state update from server
   */
  const handleSyncState = (state: PlaybackState) => {
    setPlaybackState(state);
    setSyncStatus('syncing');
  };

  /**
   * Perform periodic sync check
   */
  const performSyncCheck = () => {
    if (!player || !playbackState || !checkerRef.current) {
      return;
    }

    try {
      // Check current sync status
      const result = checkerRef.current.checkSync(
        playbackState,
        player,
        clockOffset
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
  };

  /**
   * Manually trigger a hard sync
   */
  const forceSync = () => {
    if (!player || !playbackState || !checkerRef.current) {
      return;
    }

    try {
      const result = checkerRef.current.checkSync(
        playbackState,
        player,
        clockOffset
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
  };

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
  }, [socket, player, clockOffset]);

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
  }, [player, playbackState, autoSync, checkInterval, clockOffset]);

  return {
    playbackState,
    syncStatus,
    drift,
    forceSync,
  };
}
