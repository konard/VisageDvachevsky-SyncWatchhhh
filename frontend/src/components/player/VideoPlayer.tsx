/**
 * VideoPlayer Component
 * Advanced video player with custom controls and quality selection
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize } from 'lucide-react';
import { useHLSPlayer } from '../../hooks/useHLSPlayer';
import type { HLSPlayerProps, PlayerControls } from '../../types/player';

interface VideoPlayerProps extends Omit<HLSPlayerProps, 'controls'> {
  onControlsRef?: (controls: PlayerControls) => void;
}

export function VideoPlayer({
  manifestUrl,
  autoPlay = false,
  muted: initialMuted = false,
  className = '',
  eventHandlers = {},
  onControlsRef,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [muted, setMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const { state, error, qualityLevels, currentQuality, controls, setQualityLevel } =
    useHLSPlayer({
      manifestUrl,
      videoElement: videoRef.current,
      autoPlay,
      eventHandlers: {
        ...eventHandlers,
        onTimeUpdate: (time) => {
          setCurrentTime(time);
          eventHandlers.onTimeUpdate?.(time);
        },
        onDurationChange: (dur) => {
          setDuration(dur);
          eventHandlers.onDurationChange?.(dur);
        },
      },
    });

  // Expose controls to parent
  useEffect(() => {
    if (onControlsRef) {
      onControlsRef(controls);
    }
  }, [controls, onControlsRef]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (state === 'playing') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (controls.isPlaying()) {
      controls.pause();
    } else {
      controls.play();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setMuted(!muted);
    if (videoRef.current) {
      videoRef.current.muted = !muted;
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setMuted(true);
    } else if (muted) {
      setMuted(false);
    }
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    controls.seek(time);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`video-player relative bg-black overflow-hidden rounded-lg ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => state === 'playing' && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlayPause}
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
              <h3 className="text-xl font-semibold text-white mb-2">Playback Error</h3>
              <p className="text-gray-300 text-sm mb-1">{error.message}</p>
              {error.code && (
                <p className="text-gray-500 text-xs">Error code: {error.code}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          className="w-full h-1 bg-white/20 rounded-full cursor-pointer mb-4 group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500 rounded-full relative transition-all group-hover:h-1.5"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100" />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label={state === 'playing' ? 'Pause' : 'Play'}
            >
              {state === 'playing' ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover:w-20 transition-all duration-300 accent-blue-500"
              />
            </div>

            {/* Time */}
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quality Settings */}
            {qualityLevels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="text-white hover:text-blue-400 transition-colors"
                  aria-label="Quality settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 glass-card p-2 min-w-[120px]">
                    <div className="text-white text-xs font-semibold mb-2 px-2">
                      Quality
                    </div>
                    {qualityLevels.map((level) => (
                      <button
                        key={level.index}
                        onClick={() => {
                          setQualityLevel(level.index);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          currentQuality === level.index
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {level.name}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setQualityLevel(-1);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                        currentQuality === -1
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Auto
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
              aria-label="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
