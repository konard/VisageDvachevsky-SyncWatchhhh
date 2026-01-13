/**
 * Hook for managing YouTube player with synchronization support
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import type { SyncCommand } from '@syncwatch/shared';

export interface UseYouTubePlayerOptions {
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onRateChange?: (rate: number) => void;
  onStateChange?: (state: YT.PlayerState) => void;
  onError?: (error: YT.PlayerError) => void;
}

export interface UseYouTubePlayerResult {
  playerRef: React.RefObject<YT.Player | null>;
  isReady: boolean;
  currentState: YT.PlayerState;
  currentTime: number;
  duration: number;
  playbackRate: number;
  handlePlay: () => void;
  handlePause: () => void;
  handleSeek: (seconds: number) => void;
  handleSetRate: (rate: number) => void;
  handleSyncCommand: (command: SyncCommand) => void;
  getCurrentTime: () => number;
  getPlayerState: () => YT.PlayerState;
  setPlayerReady: (ready: boolean) => void;
}

/**
 * Hook for managing YouTube player state and synchronization
 */
export function useYouTubePlayer(options: UseYouTubePlayerOptions = {}): UseYouTubePlayerResult {
  const playerRef = useRef<YT.Player | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentState, setCurrentState] = useState<YT.PlayerState>(YT.PlayerState.UNSTARTED);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Update current time periodically when playing
  useEffect(() => {
    if (currentState !== YT.PlayerState.PLAYING || !isReady) {
      return;
    }

    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentState, isReady]);

  // Handle play command
  const handlePlay = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.playVideo();
      options.onPlay?.();
    }
  }, [isReady, options]);

  // Handle pause command
  const handlePause = useCallback(() => {
    if (playerRef.current && isReady) {
      playerRef.current.pauseVideo();
      options.onPause?.();
    }
  }, [isReady, options]);

  // Handle seek command
  const handleSeek = useCallback((seconds: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
      options.onSeek?.(seconds);
    }
  }, [isReady, options]);

  // Handle playback rate change
  const handleSetRate = useCallback((rate: number) => {
    if (playerRef.current && isReady) {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRate(rate);
      options.onRateChange?.(rate);
    }
  }, [isReady, options]);

  // Handle sync commands from server
  const handleSyncCommand = useCallback((command: SyncCommand) => {
    if (!playerRef.current || !isReady) {
      return;
    }

    const now = Date.now();

    switch (command.type) {
      case 'PLAY': {
        // Calculate delay and start playing
        const delay = command.atServerTime - now;
        if (delay > 0) {
          setTimeout(() => handlePlay(), delay);
        } else {
          handlePlay();
        }
        break;
      }

      case 'PAUSE': {
        // Calculate delay and pause
        const delay = command.atServerTime - now;
        if (delay > 0) {
          setTimeout(() => handlePause(), delay);
        } else {
          handlePause();
        }
        break;
      }

      case 'SEEK': {
        // Seek to target time
        handleSeek(command.targetMediaTime / 1000); // Convert ms to seconds
        break;
      }

      case 'SET_RATE': {
        // Set playback rate
        handleSetRate(command.rate);
        break;
      }

      case 'STATE_SNAPSHOT': {
        // Apply full state snapshot
        const state = command.state;
        const targetTime = state.anchorMediaTimeMs / 1000;

        handleSeek(targetTime);
        handleSetRate(state.playbackRate);

        if (state.isPlaying) {
          handlePlay();
        } else {
          handlePause();
        }
        break;
      }
    }
  }, [isReady, handlePlay, handlePause, handleSeek, handleSetRate]);

  // Get current time from player
  const getCurrentTime = useCallback(() => {
    if (playerRef.current && isReady) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  }, [isReady]);

  // Get player state
  const getPlayerState = useCallback(() => {
    if (playerRef.current && isReady) {
      return playerRef.current.getPlayerState();
    }
    return YT.PlayerState.UNSTARTED;
  }, [isReady]);

  // Set player ready state
  const setPlayerReady = useCallback((ready: boolean) => {
    setIsReady(ready);
    if (ready && playerRef.current) {
      setDuration(playerRef.current.getDuration());
      setCurrentTime(playerRef.current.getCurrentTime());
      setPlaybackRate(playerRef.current.getPlaybackRate());
    }
  }, []);

  return {
    playerRef,
    isReady,
    currentState,
    currentTime,
    duration,
    playbackRate,
    handlePlay,
    handlePause,
    handleSeek,
    handleSetRate,
    handleSyncCommand,
    getCurrentTime,
    getPlayerState,
    setPlayerReady,
  };
}
