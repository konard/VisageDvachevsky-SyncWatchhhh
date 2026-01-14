/**
 * Hook exports
 */

export { useClockSync } from './useClockSync';
export { usePlaybackSync } from './usePlaybackSync';
export { useYouTubeIframeAPI } from './useYouTubeIframeAPI';
export type { UseYouTubeIframeAPIResult } from './useYouTubeIframeAPI';

export { useYouTubePlayer } from './useYouTubePlayer';
export type { UseYouTubePlayerOptions, UseYouTubePlayerResult } from './useYouTubePlayer';

export { useReducedMotion } from './useReducedMotion';

// Responsive hooks
export { useMediaQuery } from './useMediaQuery';
export { useBreakpoint, breakpoints } from './useBreakpoint';
export type { Breakpoint, DeviceType } from './useBreakpoint';
export { useOrientation } from './useOrientation';
export type { Orientation } from './useOrientation';

// Sound hook
export { useSound } from './useSound';

// Error handling hooks
export { useApiError } from './useApiError';
export { useVideoError, YouTubeErrorCode } from './useVideoError';
export { useVoiceError, VoiceErrorType } from './useVoiceError';

// WebSocket hooks
export { useSocket, useRoom } from './websocket';
export type { ConnectionStatus } from './websocket';
