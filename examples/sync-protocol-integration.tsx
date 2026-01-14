/**
 * Example: Video Synchronization Protocol Integration
 *
 * This example demonstrates how to use the integrated synchronization protocol
 * with clock sync, WebSocket events, and drift correction.
 *
 * The implementation follows the technical specification in:
 * - docs/TECHNICAL_SPECIFICATION.md (Section 4.2 - Video Synchronization Protocol)
 * - docs/WEBSOCKET.md (WebSocket Events Documentation)
 */

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../frontend/src/hooks/useSocket';
import { usePlaybackSync } from '../frontend/src/hooks/usePlaybackSync';
import { SyncStatusIndicator } from '../frontend/src/components/sync/SyncStatusIndicator';
import { PlayerControls } from '../frontend/src/stores/playback.store';

/**
 * Example video player component with full sync protocol integration
 */
export function SyncedVideoPlayerExample() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerControls, setPlayerControls] = useState<PlayerControls | null>(null);

  // 1. Establish WebSocket connection
  const { socket, isConnected } = useSocket('http://localhost:4000', {
    namespace: '/sync',
    autoConnect: true,
    showToasts: true,
  });

  // 2. Initialize playback synchronization with integrated clock sync
  const {
    playbackState,
    syncStatus,
    drift,
    clockOffset,
    clockSynced,
    clockRtt,
    clockSyncing,
    forceSync,
    requestResync,
    getServerTime,
  } = usePlaybackSync(socket, playerControls, {
    checkInterval: 1000,      // Check sync every second
    autoSync: true,           // Automatically correct drift
    enableClockSync: true,    // Enable NTP-like clock synchronization
  });

  // 3. Create player controls interface
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const controls: PlayerControls = {
      play: async () => {
        try {
          await video.play();
        } catch (error) {
          console.error('Play failed:', error);
        }
      },
      pause: () => {
        video.pause();
      },
      seek: (timeSeconds: number) => {
        video.currentTime = timeSeconds;
      },
      setPlaybackRate: (rate: number) => {
        video.playbackRate = rate;
      },
      getCurrentTime: () => {
        return video.currentTime;
      },
      getDuration: () => {
        return video.duration || 0;
      },
      isPlaying: () => {
        return !video.paused;
      },
    };

    setPlayerControls(controls);
  }, []);

  // 4. Handle user interactions and send sync commands
  const handlePlay = () => {
    if (socket && isConnected && clockSynced) {
      const serverTime = getServerTime();
      socket.emit('sync:play', { atServerTime: serverTime });
    }
  };

  const handlePause = () => {
    if (socket && isConnected && clockSynced) {
      const serverTime = getServerTime();
      socket.emit('sync:pause', { atServerTime: serverTime });
    }
  };

  const handleSeek = (targetTime: number) => {
    if (socket && isConnected && clockSynced) {
      const serverTime = getServerTime();
      socket.emit('sync:seek', {
        targetMediaTime: targetTime * 1000, // Convert to milliseconds
        atServerTime: serverTime
      });
    }
  };

  const handleRateChange = (rate: number) => {
    if (socket && isConnected && clockSynced) {
      const serverTime = getServerTime();
      socket.emit('sync:rate', { rate, atServerTime: serverTime });
    }
  };

  // 5. Manual resync when user clicks resync button
  const handleManualResync = () => {
    // Request fresh state from server
    requestResync();

    // Also force local sync check
    forceSync();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Synced Video Player Example</h1>

      {/* Connection Status */}
      <div className="p-4 bg-gray-100 rounded space-y-2">
        <h2 className="font-semibold">Connection Status</h2>
        <div>WebSocket: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
        <div>Clock Sync: {clockSynced ? '✅ Synced' : clockSyncing ? '⏳ Syncing...' : '❌ Not Synced'}</div>
        {clockSynced && (
          <>
            <div>Clock Offset: {clockOffset.toFixed(0)}ms</div>
            <div>Network RTT: {clockRtt.toFixed(0)}ms</div>
          </>
        )}
      </div>

      {/* Sync Status Indicator */}
      <div className="flex items-center gap-4">
        <SyncStatusIndicator
          socket={socket}
          isConnected={isConnected}
          showDetails={true}
          showResyncButton={true}
        />
        <button
          onClick={handleManualResync}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!isConnected || !clockSynced}
        >
          Force Resync
        </button>
      </div>

      {/* Playback State Info */}
      {playbackState && (
        <div className="p-4 bg-gray-100 rounded space-y-2">
          <h2 className="font-semibold">Playback State</h2>
          <div>Source: {playbackState.sourceType} - {playbackState.sourceId}</div>
          <div>Status: {playbackState.isPlaying ? '▶️ Playing' : '⏸️ Paused'}</div>
          <div>Rate: {playbackState.playbackRate}x</div>
          <div>Position: {(playbackState.anchorMediaTimeMs / 1000).toFixed(2)}s</div>
          <div>Sequence: #{playbackState.sequenceNumber}</div>
        </div>
      )}

      {/* Sync Metrics */}
      <div className="p-4 bg-gray-100 rounded space-y-2">
        <h2 className="font-semibold">Sync Metrics</h2>
        <div>Status: {syncStatus}</div>
        <div>
          Drift: {drift.toFixed(0)}ms
          {drift > 0 && ' (ahead)'}
          {drift < 0 && ' (behind)'}
        </div>
        <div className="text-sm text-gray-600">
          {Math.abs(drift) < 300 && '✅ In sync (< 300ms)'}
          {Math.abs(drift) >= 300 && Math.abs(drift) < 1000 && '⚠️ Soft resync active (300-1000ms)'}
          {Math.abs(drift) >= 1000 && '❌ Hard resync needed (> 1000ms)'}
        </div>
      </div>

      {/* Video Player */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full bg-black rounded"
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        />
      </div>

      {/* Custom Controls (for demonstration - actual sync controlled by server) */}
      <div className="p-4 bg-gray-100 rounded space-y-2">
        <h2 className="font-semibold">Controls (for testing)</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePlay}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!isConnected || !clockSynced}
          >
            Play
          </button>
          <button
            onClick={handlePause}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            disabled={!isConnected || !clockSynced}
          >
            Pause
          </button>
          <button
            onClick={() => handleSeek(0)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!isConnected || !clockSynced}
          >
            Seek to Start
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRateChange(0.5)}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={!isConnected || !clockSynced}
          >
            0.5x
          </button>
          <button
            onClick={() => handleRateChange(1.0)}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={!isConnected || !clockSynced}
          >
            1.0x
          </button>
          <button
            onClick={() => handleRateChange(1.5)}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={!isConnected || !clockSynced}
          >
            1.5x
          </button>
          <button
            onClick={() => handleRateChange(2.0)}
            className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={!isConnected || !clockSynced}
          >
            2.0x
          </button>
        </div>
      </div>

      {/* Protocol Flow Explanation */}
      <div className="p-4 bg-blue-50 rounded space-y-2">
        <h2 className="font-semibold text-blue-900">How It Works</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>WebSocket connects to server at /sync namespace</li>
          <li>Clock synchronization performs NTP-like ping/pong to calculate offset</li>
          <li>On room join, server sends initial playback state via sync:state event</li>
          <li>User actions emit sync commands with server timestamps</li>
          <li>Server broadcasts sync:command to all participants</li>
          <li>Executor service schedules/executes commands with clock-adjusted timing</li>
          <li>Checker service monitors drift every second</li>
          <li>Soft resync (rate adjustment) for drift 300ms-1000ms</li>
          <li>Hard resync (seek) for drift > 1000ms</li>
          <li>Manual resync button requests fresh state from server</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Usage in your application:
 *
 * ```tsx
 * import { SyncedVideoPlayerExample } from './examples/sync-protocol-integration';
 *
 * function App() {
 *   return <SyncedVideoPlayerExample />;
 * }
 * ```
 *
 * Key Features Implemented:
 * ✅ Clock synchronization using ClockSync library (NTP-like algorithm)
 * ✅ WebSocket connection management with auto-reconnect
 * ✅ Integrated usePlaybackSync hook combining all sync services
 * ✅ Automatic drift detection and correction (soft/hard resync)
 * ✅ Manual resync capability
 * ✅ Real-time sync status indicator
 * ✅ Server timestamp-based command execution
 * ✅ Playback state synchronization
 * ✅ Sequence number tracking
 * ✅ Out-of-order command handling
 *
 * What's Different from Before:
 * - ClockSync is now automatically integrated via usePlaybackSync
 * - Clock offset is stored in playback store and used by all sync services
 * - usePlaybackSync returns clockOffset, clockSynced, clockRtt for monitoring
 * - requestResync() method requests fresh state from server
 * - getServerTime() provides clock-adjusted server time for commands
 */
