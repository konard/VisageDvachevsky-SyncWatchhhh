import { useState } from 'react';
import clsx from 'clsx';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Settings,
} from 'lucide-react';
import { useSound } from '@/hooks';
import { SyncStatusIcon } from '../sync/SyncStatusIndicator';

interface VideoControlsProps {
  className?: string;
  showSyncStatus?: boolean;
}

/**
 * Video Controls Component
 * Displays playback controls with liquid-glass styling and Lucide icons
 */
export function VideoControls({ className, showSyncStatus = true }: VideoControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(1425); // 23:45 in seconds
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const { playClick } = useSound();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 50) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();
  const progressPercent = (currentTime / duration) * 100;

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      {/* Play/Pause Button */}
      <button
        onClick={() => {
          setIsPlaying(!isPlaying);
          playClick();
        }}
        className="w-11 h-11 rounded-full glass-button flex items-center justify-center hover:scale-110 transition-all duration-200 play-ripple"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white ml-0.5" />
        )}
      </button>

      {/* Skip Backward Button */}
      <button
        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label="Skip backward 10 seconds"
        title="Skip backward 10s"
      >
        <SkipBack className="w-4 h-4 text-white/80" />
      </button>

      {/* Skip Forward Button */}
      <button
        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label="Skip forward 10 seconds"
        title="Skip forward 10s"
      >
        <SkipForward className="w-4 h-4 text-white/80" />
      </button>

      {/* Timeline / Progress Bar */}
      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs text-gray-400 font-mono min-w-[42px]">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 relative group">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-cyan to-accent-blue rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Hover indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-cyan shadow-glow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>
        <span className="text-xs text-gray-400 font-mono min-w-[42px]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Sync Status */}
      {showSyncStatus && (
        <div className="flex items-center gap-2">
          <SyncStatusIcon className="opacity-80" />
        </div>
      )}

      {/* Volume Control */}
      <div
        className="relative flex items-center"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <button
          onClick={toggleMute}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all duration-200"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <VolumeIcon className="w-4 h-4 text-white/80" />
        </button>

        {/* Volume Slider - appears on hover */}
        <div
          className={clsx(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 glass-card rounded-xl transition-all duration-200',
            showVolumeSlider ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'
          )}
        >
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-cyan
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-glow
              [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-accent-cyan [&::-moz-range-thumb]:border-0"
            aria-label="Volume"
          />
          <div className="text-xs text-center text-gray-400 mt-1">
            {isMuted ? 0 : volume}%
          </div>
        </div>
      </div>

      {/* Settings Button */}
      <button
        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:rotate-45"
        aria-label="Settings"
        title="Video settings"
      >
        <Settings className="w-4 h-4 text-white/80" />
      </button>

      {/* Fullscreen Button */}
      <button
        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label="Fullscreen"
        title="Toggle fullscreen"
      >
        <Maximize className="w-4 h-4 text-white/80" />
      </button>
    </div>
  );
}
