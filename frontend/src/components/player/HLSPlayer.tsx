/**
 * HLSPlayer Component
 * Video player component with HLS support using hls.js
 */

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useHLSPlayer } from '../../hooks/useHLSPlayer';
import type { HLSPlayerProps, PlayerControls } from '../../types/player';

export const HLSPlayer = forwardRef<PlayerControls, HLSPlayerProps>(
  (
    {
      manifestUrl,
      autoPlay = false,
      muted = false,
      controls: showControls = true,
      className = '',
      eventHandlers = {},
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const { state, error, controls } = useHLSPlayer({
      manifestUrl,
      videoElement: videoRef.current,
      autoPlay,
      eventHandlers,
    });

    // Expose controls to parent component via ref
    useImperativeHandle(ref, () => controls, [controls]);

    // Set muted attribute
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = muted;
      }
    }, [muted]);

    return (
      <div className={`hls-player-container relative ${className}`}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          controls={showControls}
          playsInline
        />

        {/* Loading State */}
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {/* Buffering State */}
        {state === 'buffering' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {state === 'error' && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="glass-card p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Playback Error
                </h3>
                <p className="text-gray-300 text-sm mb-1">{error.message}</p>
                {error.code && (
                  <p className="text-gray-500 text-xs">Error code: {error.code}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

HLSPlayer.displayName = 'HLSPlayer';
