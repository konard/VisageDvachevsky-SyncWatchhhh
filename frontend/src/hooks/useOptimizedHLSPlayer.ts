import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface HLSConfig {
  maxBufferLength?: number;
  maxMaxBufferLength?: number;
  maxBufferSize?: number;
  maxBufferHole?: number;
  lowLatencyMode?: boolean;
  enableWorker?: boolean;
}

interface UseOptimizedHLSPlayerOptions {
  src: string;
  autoplay?: boolean;
  config?: HLSConfig;
  onReady?: () => void;
  onError?: (error: any) => void;
}

/**
 * Optimized HLS Player Hook with buffering optimization
 *
 * Performance optimizations:
 * - Configurable buffer sizes
 * - Worker-based demuxing for better performance
 * - Low latency mode support
 * - Adaptive bitrate streaming
 * - Proper cleanup and memory management
 */
export function useOptimizedHLSPlayer({
  src,
  autoplay = false,
  config = {},
  onReady,
  onError,
}: UseOptimizedHLSPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<any>(null);

  // Default optimized config
  const defaultConfig: HLSConfig = {
    // Buffer configuration for smooth playback
    maxBufferLength: 30, // 30 seconds of buffer
    maxMaxBufferLength: 60, // Max 60 seconds
    maxBufferSize: 60 * 1000 * 1000, // 60 MB
    maxBufferHole: 0.5, // Jump over holes smaller than 500ms
    lowLatencyMode: false,
    enableWorker: true, // Use web workers for better performance
  };

  const finalConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        ...finalConfig,
        enableWorker: finalConfig.enableWorker,
        lowLatencyMode: finalConfig.lowLatencyMode,
        backBufferLength: 90, // Keep 90 seconds of back buffer for seeking
      });

      hlsRef.current = hls;

      // Load source
      hls.loadSource(src);
      hls.attachMedia(video);

      // Event listeners
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        onReady?.();

        if (autoplay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              setError(data);
              onError?.(data);
              hls.destroy();
              break;
          }
        }
      });

      // Buffer management events for monitoring
      hls.on(Hls.Events.BUFFER_APPENDING, () => {
        // Monitor buffer appending
      });

      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        // Monitor buffer appended
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsReady(true);
        onReady?.();

        if (autoplay) {
          video.play().catch(console.error);
        }
      });

      video.addEventListener('error', () => {
        const err = video.error;
        setError(err);
        onError?.(err);
      });
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsReady(false);
      setError(null);
    };
  }, [src, autoplay, finalConfig, onReady, onError]);

  const play = useCallback(() => {
    return videoRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const getCurrentQuality = useCallback(() => {
    return hlsRef.current?.currentLevel ?? -1;
  }, []);

  const setQuality = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  }, []);

  const getAvailableQualities = useCallback(() => {
    return hlsRef.current?.levels ?? [];
  }, []);

  return {
    videoRef,
    isReady,
    error,
    play,
    pause,
    seek,
    setVolume,
    getCurrentQuality,
    setQuality,
    getAvailableQualities,
  };
}
