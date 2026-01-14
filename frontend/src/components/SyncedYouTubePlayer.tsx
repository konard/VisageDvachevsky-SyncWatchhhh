/**
 * Synchronized YouTube Player Component
 * Integrates YouTube player with WebSocket synchronization
 */

import { useEffect, useState, useCallback } from 'react';
import { YouTubePlayer } from './YouTubePlayer';
import { useYouTubePlayer, YT_PLAYER_STATE } from '../hooks/useYouTubePlayer';
import type { SyncCommand } from '@syncwatch/shared';

export interface SyncedYouTubePlayerProps {
  videoUrl: string;
  isOwner?: boolean;
  onSyncCommand?: (command: SyncCommand) => void;
  onPlaybackReport?: (data: { currentTime: number; isPlaying: boolean }) => void;
  className?: string;
}

export const SyncedYouTubePlayer = ({
  videoUrl,
  isOwner = false,
  onSyncCommand,
  onPlaybackReport,
  className = '',
}: SyncedYouTubePlayerProps) => {
  const [videoState, setVideoState] = useState<{
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  }>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });

  const {
    isReady,
    currentState,
    currentTime,
    duration,
    playbackRate,
    getCurrentTime,
    getPlayerState,
    setPlayerReady,
  } = useYouTubePlayer({
    onPlay: () => {
      if (isOwner && onSyncCommand) {
        onSyncCommand({
          type: 'PLAY',
          atServerTime: Date.now(),
          sequenceNumber: Date.now(),
        });
      }
    },
    onPause: () => {
      if (isOwner && onSyncCommand) {
        onSyncCommand({
          type: 'PAUSE',
          atServerTime: Date.now(),
          sequenceNumber: Date.now(),
        });
      }
    },
    onSeek: (time: number) => {
      if (isOwner && onSyncCommand) {
        onSyncCommand({
          type: 'SEEK',
          targetMediaTime: time * 1000, // Convert to ms
          atServerTime: Date.now(),
          sequenceNumber: Date.now(),
        });
      }
    },
    onRateChange: (rate: number) => {
      if (isOwner && onSyncCommand) {
        onSyncCommand({
          type: 'SET_RATE',
          rate,
          atServerTime: Date.now(),
          sequenceNumber: Date.now(),
        });
      }
    },
    onStateChange: (state: YT.PlayerState) => {
      setVideoState(prev => ({
        ...prev,
        isPlaying: state === YT_PLAYER_STATE.PLAYING,
      }));
    },
    onError: (error: YT.PlayerError) => {
      console.error('YouTube player error:', error);
    },
  });

  // Update video state
  useEffect(() => {
    setVideoState({
      isPlaying: currentState === YT_PLAYER_STATE.PLAYING,
      currentTime,
      duration,
    });
  }, [currentState, currentTime, duration]);

  // Report playback state periodically
  useEffect(() => {
    if (!isReady || !onPlaybackReport) {
      return;
    }

    const interval = setInterval(() => {
      const time = getCurrentTime();
      const state = getPlayerState();
      onPlaybackReport({
        currentTime: time,
        isPlaying: state === YT_PLAYER_STATE.PLAYING,
      });
    }, 5000); // Report every 5 seconds

    return () => clearInterval(interval);
  }, [isReady, getCurrentTime, getPlayerState, onPlaybackReport]);

  // Handle player ready
  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
  }, [setPlayerReady]);

  // Handle state change
  const handleStateChange = useCallback((state: YT.PlayerState) => {
    setVideoState(prev => ({
      ...prev,
      isPlaying: state === YT_PLAYER_STATE.PLAYING,
    }));
  }, []);

  return (
    <div className={`synced-youtube-player ${className}`}>
      <YouTubePlayer
        videoUrl={videoUrl}
        width="100%"
        height="100%"
        autoplay={false}
        controls={true}
        onReady={handlePlayerReady}
        onStateChange={handleStateChange}
        onError={(error) => {
          console.error('YouTube player error:', error);
        }}
        className="w-full h-full"
      />

      {/* Playback info overlay (for debugging) */}
      {process.env.NODE_ENV === 'development' && isReady && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
          <div className="flex justify-between items-center">
            <div>
              Status: {videoState.isPlaying ? 'Playing' : 'Paused'} |
              Time: {videoState.currentTime.toFixed(1)}s / {videoState.duration.toFixed(1)}s |
              Rate: {playbackRate}x
            </div>
            <div className="text-yellow-400">
              {isOwner ? '👑 Owner' : '👤 Participant'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export hook for external sync control
export function useSyncedYouTubePlayer() {
  const player = useYouTubePlayer();

  const handleExternalSync = useCallback((command: SyncCommand) => {
    player.handleSyncCommand(command);
  }, [player]);

  return {
    ...player,
    handleExternalSync,
  };
}
