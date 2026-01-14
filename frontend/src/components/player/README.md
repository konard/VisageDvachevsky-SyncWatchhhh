# HLS Player Components

React components for playing HLS video streams using hls.js with comprehensive features and error handling.

## Components

### HLSPlayer

Basic HLS player component with built-in browser controls.

```tsx
import { HLSPlayer } from '@/components/player';
import { useRef } from 'react';
import type { PlayerControls } from '@/types/player';

function MyComponent() {
  const playerRef = useRef<PlayerControls>(null);

  return (
    <HLSPlayer
      ref={playerRef}
      manifestUrl="https://example.com/video.m3u8"
      autoPlay={false}
      muted={false}
      controls={true}
      eventHandlers={{
        onReady: () => console.log('Player ready'),
        onPlay: () => console.log('Playing'),
        onPause: () => console.log('Paused'),
        onTimeUpdate: (time) => console.log('Current time:', time),
        onError: (error) => console.error('Error:', error),
      }}
    />
  );
}
```

### VideoPlayer

Advanced player with custom controls, quality selection, and fullscreen support.

```tsx
import { VideoPlayer } from '@/components/player';
import type { PlayerControls } from '@/types/player';

function MyComponent() {
  const handleControlsRef = (controls: PlayerControls) => {
    // Store controls reference for external control
    window.playerControls = controls;
  };

  return (
    <VideoPlayer
      manifestUrl="https://example.com/video.m3u8"
      autoPlay={false}
      muted={false}
      className="h-96"
      onControlsRef={handleControlsRef}
      eventHandlers={{
        onReady: () => console.log('Ready'),
        onPlay: () => console.log('Playing'),
        onPause: () => console.log('Paused'),
        onSeeked: (time) => console.log('Seeked to:', time),
        onQualityChange: (level) => console.log('Quality changed:', level),
      }}
    />
  );
}
```

## Features

- ✅ HLS.js integration for cross-browser support
- ✅ Safari native HLS fallback
- ✅ Adaptive bitrate streaming
- ✅ Manual quality level switching
- ✅ Loading, buffering, and error states
- ✅ Play, pause, seek controls
- ✅ Playback rate adjustment
- ✅ Volume control with mute
- ✅ Fullscreen support
- ✅ Time display and progress bar
- ✅ Event handlers for synchronization
- ✅ Comprehensive error handling with recovery
- ✅ TypeScript support

## Player Controls API

The player exposes a controls API via ref:

```typescript
interface PlayerControls {
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
```

### Example Usage

```tsx
const playerRef = useRef<PlayerControls>(null);

// Play
playerRef.current?.play();

// Pause
playerRef.current?.pause();

// Seek to 30 seconds
playerRef.current?.seek(30);

// Set playback rate to 1.5x
playerRef.current?.setPlaybackRate(1.5);

// Get current time
const time = playerRef.current?.getCurrentTime();

// Get duration
const duration = playerRef.current?.getDuration();

// Check if playing
const isPlaying = playerRef.current?.isPlaying();
```

## Event Handlers

Available event handlers:

```typescript
interface PlayerEventHandlers {
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
```

## Player States

```typescript
type PlayerState =
  | 'loading'    // Initial loading state
  | 'ready'      // Ready to play
  | 'playing'    // Currently playing
  | 'paused'     // Paused
  | 'buffering'  // Buffering data
  | 'error';     // Error occurred
```

## Quality Levels

Quality levels are automatically detected from the HLS manifest:

```typescript
interface QualityLevel {
  index: number;      // Level index (-1 for auto)
  height: number;     // Video height in pixels
  width: number;      // Video width in pixels
  bitrate: number;    // Bitrate in bits per second
  name: string;       // Display name (e.g., "1080p")
}
```

## Error Handling

Errors are reported via the `onError` event handler:

```typescript
interface PlayerError {
  code: string;       // Error code
  message: string;    // Human-readable message
  fatal: boolean;     // Whether the error is fatal
  details?: unknown;  // Additional error details
}
```

The player automatically attempts recovery for network and media errors.

## Configuration

Advanced HLS.js configuration:

```tsx
import { useHLSPlayer } from '@/hooks/useHLSPlayer';

const { controls } = useHLSPlayer({
  manifestUrl: 'https://example.com/video.m3u8',
  videoElement: videoRef.current,
  config: {
    debug: false,
    autoStartLoad: true,
    startPosition: -1,
    capLevelToPlayerSize: true,
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
  },
});
```

## Browser Support

- Chrome/Edge: HLS.js
- Firefox: HLS.js
- Safari: Native HLS
- Mobile browsers: Native HLS or HLS.js

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Demo

See `examples/hls-player-demo.html` for a standalone demo page.
