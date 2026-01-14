import { useState } from 'react';
import clsx from 'clsx';

interface VideoControlsProps {
  className?: string;
}

/**
 * Video Controls Component
 * Displays playback controls (play/pause, skip, timeline)
 */
export function VideoControls({ className }: VideoControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(1425); // 23:45 in seconds

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 rounded-full glass-button flex items-center justify-center hover:scale-110 transition-transform"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <span className="text-white text-lg">⏸</span>
        ) : (
          <span className="text-white text-lg">▶</span>
        )}
      </button>

      {/* Previous Button */}
      <button
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        aria-label="Previous"
      >
        <span className="text-white">◁</span>
      </button>

      {/* Next Button */}
      <button
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        aria-label="Next"
      >
        <span className="text-white">▷</span>
      </button>

      {/* Timeline */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleProgressChange}
          className="flex-1 h-1 bg-white/10 rounded-full outline-none appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-cyan
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-glow
            [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-accent-cyan [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>

      {/* Time Display */}
      <div className="text-sm text-gray-400 font-mono min-w-[80px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Volume Button */}
      <button
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        aria-label="Volume"
      >
        <span className="text-white text-sm">🔊</span>
      </button>

      {/* Fullscreen Button */}
      <button
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        aria-label="Fullscreen"
      >
        <span className="text-white text-sm">⛶</span>
      </button>
    </div>
  );
}
