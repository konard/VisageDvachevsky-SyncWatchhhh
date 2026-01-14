/**
 * HLS Player Types
 * Type definitions for the HLS video player component
 */

export type PlayerState =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'error';

export interface PlayerControls {
  play(): void;
  pause(): void;
  seek(time: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
  getState(): PlayerState;
  destroy(): void;
}

export interface QualityLevel {
  index: number;
  height: number;
  width: number;
  bitrate: number;
  name: string;
}

export interface PlayerEventHandlers {
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeeked?: (time: number) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onBuffering?: (isBuffering: boolean) => void;
  onError?: (error: PlayerError) => void;
  onQualityChange?: (level: QualityLevel) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onStateChange?: (state: PlayerState) => void;
}

export interface PlayerError {
  code: string;
  message: string;
  fatal: boolean;
  details?: unknown;
}

export interface HLSPlayerProps {
  manifestUrl: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  eventHandlers?: PlayerEventHandlers;
}

export interface HLSPlayerConfig {
  debug?: boolean;
  autoStartLoad?: boolean;
  startPosition?: number;
  capLevelToPlayerSize?: boolean;
  maxBufferLength?: number;
  maxMaxBufferLength?: number;
  maxBufferSize?: number;
  maxBufferHole?: number;
}
