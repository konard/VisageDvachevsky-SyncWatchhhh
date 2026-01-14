/**
 * YouTube Player Component
 * Wrapper for YouTube IFrame API with React interface
 */

import { useEffect, useRef, useState } from 'react';
import { useYouTubeIframeAPI } from '../hooks/useYouTubeIframeAPI';
import { extractYouTubeVideoId } from '../utils/youtube';
import { YT_PLAYER_STATE } from '../hooks/useYouTubePlayer';

export interface YouTubePlayerProps {
  videoUrl?: string;
  videoId?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  controls?: boolean;
  onReady?: () => void;
  onStateChange?: (state: YT.PlayerState) => void;
  onError?: (error: YT.PlayerError) => void;
  onPlaybackRateChange?: (rate: number) => void;
  className?: string;
}

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => YT.PlayerState;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  getPlayer: () => YT.Player | null;
}

export const YouTubePlayer = ({
  videoUrl,
  videoId: propVideoId,
  width = '100%',
  height = '100%',
  autoplay = false,
  controls = true,
  onReady,
  onStateChange,
  onError,
  onPlaybackRateChange,
  className = '',
}: YouTubePlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const playerIdRef = useRef(`youtube-player-${Math.random().toString(36).substr(2, 9)}`);

  const [playerReady, setPlayerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, isLoading, error: apiError } = useYouTubeIframeAPI();

  // Extract video ID from URL or use direct ID
  const videoId = videoUrl ? extractYouTubeVideoId(videoUrl) : propVideoId;

  // Initialize player when API is loaded
  useEffect(() => {
    if (!isLoaded || !window.YT || !videoId) {
      return;
    }

    // Clean up existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    try {
      // Create player
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        width,
        height,
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: controls ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            setError(null);
            onReady?.();
          },
          onStateChange: (event) => {
            onStateChange?.(event.data);
          },
          onError: (event) => {
            const errorMessages: Record<YT.PlayerError, string> = {
              [YT.PlayerError.INVALID_PARAM]: 'Invalid video parameter',
              [YT.PlayerError.HTML5_ERROR]: 'HTML5 player error',
              [YT.PlayerError.VIDEO_NOT_FOUND]: 'Video not found',
              [YT.PlayerError.EMBED_NOT_ALLOWED]: 'Video cannot be embedded',
              [YT.PlayerError.EMBED_NOT_ALLOWED_DISGUISE]: 'Video cannot be embedded',
            };
            setError(errorMessages[event.data] || 'Unknown player error');
            onError?.(event.data);
          },
          onPlaybackRateChange: (event) => {
            onPlaybackRateChange?.(event.data);
          },
        },
      });
    } catch (err) {
      setError(`Failed to create player: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isLoaded, videoId, width, height, autoplay, controls, onReady, onStateChange, onError, onPlaybackRateChange]);

  // Render error state
  if (apiError) {
    return (
      <div className={`youtube-player-error ${className}`}>
        <div className="error-content">
          <p className="error-title">Failed to load YouTube player</p>
          <p className="error-message">{apiError.message}</p>
        </div>
      </div>
    );
  }

  // Render error if video URL/ID is invalid
  if (!videoId && (videoUrl || propVideoId)) {
    return (
      <div className={`youtube-player-error ${className}`}>
        <div className="error-content">
          <p className="error-title">Invalid YouTube video</p>
          <p className="error-message">Could not extract video ID from the provided URL</p>
        </div>
      </div>
    );
  }

  // Render error if no video specified
  if (!videoId) {
    return (
      <div className={`youtube-player-error ${className}`}>
        <div className="error-content">
          <p className="error-title">No video specified</p>
          <p className="error-message">Please provide a videoUrl or videoId</p>
        </div>
      </div>
    );
  }

  // Render player error
  if (error) {
    return (
      <div className={`youtube-player-error ${className}`}>
        <div className="error-content">
          <p className="error-title">Player error</p>
          <p className="error-message">{error}</p>
          <p className="error-hint">YouTube sync may vary slightly due to API restrictions</p>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading || !playerReady) {
    return (
      <div className={`youtube-player-loading ${className}`}>
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading YouTube player...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`youtube-player ${className}`}>
      <div id={playerIdRef.current} />
    </div>
  );
};

// Create imperative handle for accessing player methods
export function createYouTubePlayerRef(playerRef: React.RefObject<YT.Player | null>): YouTubePlayerRef {
  return {
    play: () => {
      playerRef.current?.playVideo();
    },
    pause: () => {
      playerRef.current?.pauseVideo();
    },
    seekTo: (seconds: number, allowSeekAhead = true) => {
      playerRef.current?.seekTo(seconds, allowSeekAhead);
    },
    getCurrentTime: () => {
      return playerRef.current?.getCurrentTime() ?? 0;
    },
    getDuration: () => {
      return playerRef.current?.getDuration() ?? 0;
    },
    getPlayerState: () => {
      return playerRef.current?.getPlayerState() ?? (YT_PLAYER_STATE.UNSTARTED as YT.PlayerState);
    },
    setPlaybackRate: (rate: number) => {
      playerRef.current?.setPlaybackRate(rate);
    },
    getPlaybackRate: () => {
      return playerRef.current?.getPlaybackRate() ?? 1;
    },
    setVolume: (volume: number) => {
      playerRef.current?.setVolume(volume);
    },
    getVolume: () => {
      return playerRef.current?.getVolume() ?? 100;
    },
    mute: () => {
      playerRef.current?.mute();
    },
    unmute: () => {
      playerRef.current?.unMute();
    },
    isMuted: () => {
      return playerRef.current?.isMuted() ?? false;
    },
    loadVideoById: (videoId: string, startSeconds = 0) => {
      playerRef.current?.loadVideoById(videoId, startSeconds);
    },
    getPlayer: () => {
      return playerRef.current;
    },
  };
}
