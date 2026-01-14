/**
 * useHLSPlayer Hook
 * Custom hook for managing HLS video player with hls.js
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls, { Events, ErrorData, Level } from 'hls.js';
import type {
  PlayerState,
  PlayerControls,
  PlayerEventHandlers,
  QualityLevel,
  PlayerError,
  HLSPlayerConfig,
} from '../types/player';

interface UseHLSPlayerOptions {
  manifestUrl: string;
  videoElement: HTMLVideoElement | null;
  autoPlay?: boolean;
  eventHandlers?: PlayerEventHandlers;
  config?: HLSPlayerConfig;
}

interface UseHLSPlayerResult {
  state: PlayerState;
  error: PlayerError | null;
  qualityLevels: QualityLevel[];
  currentQuality: number;
  controls: PlayerControls;
  setQualityLevel: (levelIndex: number) => void;
}

export function useHLSPlayer({
  manifestUrl,
  videoElement,
  autoPlay = false,
  eventHandlers = {},
  config = {},
}: UseHLSPlayerOptions): UseHLSPlayerResult {
  const hlsRef = useRef<Hls | null>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [error, setError] = useState<PlayerError | null>(null);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const isPlayingRef = useRef(false);
  const lastTimeUpdateRef = useRef<number>(0);

  // Update state with event notification
  const updateState = useCallback(
    (newState: PlayerState) => {
      setState(newState);
      eventHandlers.onStateChange?.(newState);
    },
    [eventHandlers]
  );

  // Initialize HLS player
  useEffect(() => {
    if (!videoElement || !manifestUrl) return;

    // Check if HLS is supported
    const isHLSSupported = Hls.isSupported();
    const isNativeHLSSupported = videoElement.canPlayType('application/vnd.apple.mpegurl');

    if (!isHLSSupported && !isNativeHLSSupported) {
      const err: PlayerError = {
        code: 'UNSUPPORTED',
        message: 'HLS is not supported in this browser',
        fatal: true,
      };
      setError(err);
      updateState('error');
      eventHandlers.onError?.(err);
      return;
    }

    // Safari native HLS support
    if (!isHLSSupported && isNativeHLSSupported) {
      videoElement.src = manifestUrl;
      updateState('ready');

      if (autoPlay) {
        videoElement.play().catch((err) => {
          const playerError: PlayerError = {
            code: 'AUTOPLAY_FAILED',
            message: 'Autoplay failed',
            fatal: false,
            details: err,
          };
          setError(playerError);
          eventHandlers.onError?.(playerError);
        });
      }
      return;
    }

    // hls.js initialization
    const hls = new Hls({
      debug: config.debug ?? false,
      autoStartLoad: config.autoStartLoad ?? true,
      startPosition: config.startPosition ?? -1,
      capLevelToPlayerSize: config.capLevelToPlayerSize ?? true,
      maxBufferLength: config.maxBufferLength ?? 30,
      maxMaxBufferLength: config.maxMaxBufferLength ?? 600,
      maxBufferSize: config.maxBufferSize ?? 60 * 1000 * 1000,
      maxBufferHole: config.maxBufferHole ?? 0.5,
    });

    hlsRef.current = hls;

    // Event: Manifest parsed - ready to play
    hls.on(Events.MANIFEST_PARSED, (_event, data) => {
      updateState('ready');
      eventHandlers.onReady?.();

      // Extract quality levels
      const levels: QualityLevel[] = data.levels.map((level: Level, index: number) => ({
        index,
        height: level.height,
        width: level.width,
        bitrate: level.bitrate,
        name: `${level.height}p`,
      }));
      setQualityLevels(levels);
      setCurrentQuality(hls.currentLevel);

      if (autoPlay) {
        videoElement.play().catch((err) => {
          const playerError: PlayerError = {
            code: 'AUTOPLAY_FAILED',
            message: 'Autoplay failed',
            fatal: false,
            details: err,
          };
          setError(playerError);
          eventHandlers.onError?.(playerError);
        });
      }
    });

    // Event: Level switched (quality change)
    hls.on(Events.LEVEL_SWITCHED, (_event, data) => {
      setCurrentQuality(data.level);
      const level = qualityLevels[data.level];
      if (level) {
        eventHandlers.onQualityChange?.(level);
      }
    });

    // Event: Fragment buffered
    hls.on(Events.FRAG_BUFFERED, () => {
      if (state === 'buffering') {
        updateState(isPlayingRef.current ? 'playing' : 'paused');
        eventHandlers.onBuffering?.(false);
      }
    });

    // Event: Error handling
    hls.on(Events.ERROR, (_event, data: ErrorData) => {
      const playerError: PlayerError = {
        code: data.type,
        message: data.details,
        fatal: data.fatal,
        details: data,
      };

      setError(playerError);
      eventHandlers.onError?.(playerError);

      if (data.fatal) {
        updateState('error');
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Try to recover from network error
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Try to recover from media error
            hls.recoverMediaError();
            break;
          default:
            // Cannot recover
            hls.destroy();
            break;
        }
      }
    });

    // Load and attach media
    hls.loadSource(manifestUrl);
    hls.attachMedia(videoElement);

    // Cleanup
    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [manifestUrl, videoElement, autoPlay, config, eventHandlers, state, updateState, qualityLevels]);

  // Video element event listeners
  useEffect(() => {
    if (!videoElement) return;

    const handlePlay = () => {
      isPlayingRef.current = true;
      updateState('playing');
      eventHandlers.onPlay?.();
    };

    const handlePause = () => {
      isPlayingRef.current = false;
      updateState('paused');
      eventHandlers.onPause?.();
    };

    const handleSeeked = () => {
      const currentTime = videoElement.currentTime;
      eventHandlers.onSeeked?.(currentTime);
    };

    const handleTimeUpdate = () => {
      const currentTime = videoElement.currentTime;
      // Throttle time updates to avoid too many events
      if (Math.abs(currentTime - lastTimeUpdateRef.current) > 0.1) {
        lastTimeUpdateRef.current = currentTime;
        eventHandlers.onTimeUpdate?.(currentTime);
      }
    };

    const handleDurationChange = () => {
      const duration = videoElement.duration;
      if (!isNaN(duration) && isFinite(duration)) {
        eventHandlers.onDurationChange?.(duration);
      }
    };

    const handleWaiting = () => {
      updateState('buffering');
      eventHandlers.onBuffering?.(true);
    };

    const handleCanPlay = () => {
      if (state === 'buffering') {
        updateState(isPlayingRef.current ? 'playing' : 'paused');
        eventHandlers.onBuffering?.(false);
      }
    };

    const handleRateChange = () => {
      eventHandlers.onPlaybackRateChange?.(videoElement.playbackRate);
    };

    const handleError = () => {
      if (videoElement.error) {
        const playerError: PlayerError = {
          code: `MEDIA_ERROR_${videoElement.error.code}`,
          message: videoElement.error.message || 'Media error occurred',
          fatal: true,
        };
        setError(playerError);
        updateState('error');
        eventHandlers.onError?.(playerError);
      }
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('seeked', handleSeeked);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ratechange', handleRateChange);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('seeked', handleSeeked);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ratechange', handleRateChange);
      videoElement.removeEventListener('error', handleError);
    };
  }, [videoElement, eventHandlers, state, updateState]);

  // Player controls
  const controls: PlayerControls = {
    play: useCallback(() => {
      videoElement?.play().catch((err) => {
        const playerError: PlayerError = {
          code: 'PLAY_FAILED',
          message: 'Failed to play video',
          fatal: false,
          details: err,
        };
        setError(playerError);
        eventHandlers.onError?.(playerError);
      });
    }, [videoElement, eventHandlers]),

    pause: useCallback(() => {
      videoElement?.pause();
    }, [videoElement]),

    seek: useCallback(
      (time: number) => {
        if (videoElement) {
          videoElement.currentTime = time;
        }
      },
      [videoElement]
    ),

    setPlaybackRate: useCallback(
      (rate: number) => {
        if (videoElement) {
          videoElement.playbackRate = rate;
        }
      },
      [videoElement]
    ),

    getCurrentTime: useCallback(() => {
      return videoElement?.currentTime ?? 0;
    }, [videoElement]),

    getDuration: useCallback(() => {
      return videoElement?.duration ?? 0;
    }, [videoElement]),

    isPlaying: useCallback(() => {
      return isPlayingRef.current;
    }, []),

    getState: useCallback(() => {
      return state;
    }, [state]),

    destroy: useCallback(() => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }, []),
  };

  const setQualityLevel = useCallback(
    (levelIndex: number) => {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = levelIndex;
      }
    },
    []
  );

  return {
    state,
    error,
    qualityLevels,
    currentQuality,
    controls,
    setQualityLevel,
  };
}
