# Video Synchronization Protocol Implementation

## Overview

This document describes the implementation of the video synchronization protocol as specified in [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) Section 4.2 and [WEBSOCKET.md](./WEBSOCKET.md).

## Architecture

The synchronization system consists of several integrated components:

```
┌─────────────────────────────────────────────────────────┐
│                    React Component                      │
│  (uses usePlaybackSync hook)                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              usePlaybackSync Hook                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  - Integrates ClockSync (useClockSync)            │ │
│  │  - Manages WebSocket event handlers               │ │
│  │  - Coordinates sync services                      │ │
│  │  - Updates playback store                         │ │
│  └───────────────────────────────────────────────────┘ │
└──────┬──────────────────┬──────────────────┬───────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
│  ClockSync  │  │SyncExecutor  │  │  SyncChecker    │
│  (NTP-like) │  │  Service     │  │   Service       │
└─────────────┘  └──────────────┘  └─────────────────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │   Socket.io  │
                  │  Connection  │
                  └──────────────┘
                          │
                          ▼
                    [ Server ]
```

## Components

### 1. ClockSync Library (`frontend/src/lib/ClockSync.ts`)

Implements NTP-like clock synchronization to calculate offset between client and server clocks.

**Algorithm:**
1. Client sends `time:ping` with `clientTime` timestamp
2. Server responds with `time:pong` containing `clientTime` and `serverTime`
3. Client calculates RTT and offset:
   ```typescript
   const rtt = clientTimeReceived - clientTimeSent;
   const serverTimeNow = serverTime + rtt / 2;
   const offset = serverTimeNow - clientTimeReceived;
   ```
4. Process is repeated 5 times
5. Best samples (lowest RTT) are averaged for final offset

**Usage:**
```typescript
const clockSync = new ClockSync();
const offset = await clockSync.sync(socket, 5, 100);
const serverTime = clockSync.getServerTime();
```

### 2. useClockSync Hook (`frontend/src/hooks/useClockSync.ts`)

React hook wrapper for ClockSync with automatic lifecycle management.

**Features:**
- Auto-sync on WebSocket connection
- Periodic re-sync every 30 seconds
- Manual sync trigger
- Error handling and state management
- Cleanup on disconnect/unmount

**Returns:**
- `offset`: Clock offset in milliseconds
- `synced`: Whether clock is synchronized
- `rtt`: Average round-trip time
- `syncing`: Whether sync is in progress
- `error`: Sync error if failed
- `getServerTime()`: Get current server time
- `sync()`: Manually trigger sync
- `reset()`: Reset sync state

### 3. SyncExecutor Service (`frontend/src/services/syncExecutor.service.ts`)

Executes sync commands with precise timing.

**Command Execution:**
```typescript
const localTime = command.atServerTime - clockOffset;
const now = Date.now();
const delay = localTime - now;

if (delay > 50) {
  // Future command - schedule it
  setTimeout(() => performCommand(command), delay);
} else if (delay > -1000) {
  // Recent past or immediate - execute now
  performCommand(command);
}
```

**Supported Commands:**
- `PLAY`: Start playback
- `PAUSE`: Pause playback
- `SEEK`: Jump to specific time
- `SET_RATE`: Change playback speed
- `STATE_SNAPSHOT`: Apply full state update

### 4. SyncChecker Service (`frontend/src/services/syncChecker.service.ts`)

Monitors playback drift and applies corrections.

**Drift Calculation:**
```typescript
const expectedTime = state.anchorMediaTimeMs +
  (serverTime - state.anchorServerTimeMs) * state.playbackRate;
const actualTime = player.getCurrentTime() * 1000;
const drift = actualTime - expectedTime;
```

**Correction Strategies:**
- **No Action** (`drift < 300ms`): Within tolerance
- **Soft Resync** (`300ms ≤ drift < 1000ms`): Adjust playback rate
  - Ahead: Slow to 0.97x for gradual catch-up
  - Behind: Speed to 1.03x for gradual catch-up
- **Hard Resync** (`drift ≥ 1000ms`): Immediate seek to correct position

### 5. usePlaybackSync Hook (`frontend/src/hooks/usePlaybackSync.ts`)

Main integration hook that coordinates all sync components.

**Configuration:**
```typescript
const {
  playbackState,      // Current server state
  syncStatus,         // 'synced' | 'syncing' | 'drifted' | 'error'
  drift,              // Drift in milliseconds
  clockOffset,        // Clock offset from server
  clockSynced,        // Whether clock is synchronized
  clockRtt,           // Network round-trip time
  forceSync,          // Force hard sync
  requestResync,      // Request fresh state from server
  getServerTime,      // Get server time
} = usePlaybackSync(socket, player, {
  checkInterval: 1000,    // Check drift every second
  autoSync: true,         // Auto-correct drift
  enableClockSync: true,  // Enable clock sync
});
```

**WebSocket Event Handlers:**
- `sync:command`: Execute incoming sync command
- `sync:state`: Update playback state
- Auto-cleanup on unmount

**Periodic Drift Checking:**
- Runs every 1 second (configurable)
- Updates sync status and drift
- Applies corrections automatically

### 6. Playback Store (`frontend/src/stores/playback.store.ts`)

Zustand store for global sync state management.

**State:**
```typescript
interface PlaybackStore {
  playbackState: PlaybackState | null;
  syncStatus: SyncStatus;
  drift: number;
  clockOffset: number;
  playerControls: PlayerControls | null;
  // ... actions
}
```

### 7. SyncStatusIndicator Component (`frontend/src/components/sync/SyncStatusIndicator.tsx`)

Visual indicator showing current sync status.

**Status Colors:**
- 🟢 Green: Synced (`drift < 300ms`)
- 🟡 Yellow: Drifted (`300ms ≤ drift < 1000ms`)
- 🔴 Red: Desynced (`drift ≥ 1000ms`)

**Features:**
- Shows drift value
- Resync button when desynced
- Animated spinner during sync
- Integrates with playback store

## Protocol Flow

### Initial Connection

```
Client                              Server
  |                                    |
  |---> connect ---------------------->|
  |<--- connect ------------------------|
  |                                    |
  |---> time:ping -------------------->|
  |     { clientTime: 1000 }           |
  |<--- time:pong ----------------------|
  |     { clientTime: 1000,            |
  |       serverTime: 1050 }           |
  |                                    |
  | (repeat 5 times)                   |
  | Calculate offset = +50ms           |
  |                                    |
  |---> room:join -------------------->|
  |     { roomCode, password }         |
  |<--- room:state ---------------------|
  |     { room, participants,          |
  |       playbackState }              |
```

### Sync Command Flow

```
User Action (Play)
  |
  v
getServerTime() = Date.now() + offset
  |
  v
socket.emit('sync:play', { atServerTime })
  |
  v
Server receives, validates, broadcasts
  |
  v
socket.on('sync:command', { type: 'PLAY', atServerTime, sequenceNumber })
  |
  v
SyncExecutor.executeCommand()
  |
  v
Calculate delay = (atServerTime - offset) - Date.now()
  |
  v
Schedule/Execute play()
```

### Drift Correction Flow

```
Every 1 second:
  |
  v
Calculate expected position
  expectedTime = anchorMediaTimeMs +
    (serverTime - anchorServerTimeMs) * playbackRate
  |
  v
Get actual position
  actualTime = player.getCurrentTime() * 1000
  |
  v
Calculate drift
  drift = actualTime - expectedTime
  |
  v
Determine action
  |
  +---> drift < 300ms -----> No action needed
  |
  +---> 300ms ≤ drift < 1000ms -----> Soft resync
  |                                   (adjust playback rate)
  |
  +---> drift ≥ 1000ms -----> Hard resync
                              (seek to correct position)
```

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `time:ping` | `{ clientTime }` | Clock sync ping |
| `room:join` | `{ roomCode, password?, guestName? }` | Join room |
| `sync:play` | `{ atServerTime }` | Play command |
| `sync:pause` | `{ atServerTime }` | Pause command |
| `sync:seek` | `{ targetMediaTime, atServerTime }` | Seek command |
| `sync:rate` | `{ rate, atServerTime }` | Rate change |
| `sync:resync` | `{}` | Request fresh state |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `time:pong` | `{ clientTime, serverTime }` | Clock sync pong |
| `room:state` | `{ room, participants, playback }` | Initial state |
| `sync:command` | `SyncCommand` | Broadcast command |
| `sync:state` | `PlaybackState` | State snapshot |

## Data Types

### PlaybackState

```typescript
interface PlaybackState {
  roomId: string;
  sourceType: 'upload' | 'youtube' | 'external';
  sourceId: string;
  isPlaying: boolean;
  playbackRate: number;
  anchorServerTimeMs: number;  // Server timestamp
  anchorMediaTimeMs: number;   // Media position
  sequenceNumber: number;      // Monotonic counter
}
```

### SyncCommand

```typescript
type SyncCommand =
  | { type: 'PLAY'; atServerTime: number; sequenceNumber: number }
  | { type: 'PAUSE'; atServerTime: number; sequenceNumber: number }
  | { type: 'SEEK'; targetMediaTime: number; atServerTime: number; sequenceNumber: number }
  | { type: 'SET_RATE'; rate: number; atServerTime: number; sequenceNumber: number }
  | { type: 'STATE_SNAPSHOT'; state: PlaybackState };
```

## Usage Example

See [examples/sync-protocol-integration.tsx](../examples/sync-protocol-integration.tsx) for a complete example.

Basic usage:

```typescript
import { useSocket } from '@/hooks/useSocket';
import { usePlaybackSync } from '@/hooks/usePlaybackSync';

function VideoPlayer() {
  const { socket, isConnected } = useSocket('http://localhost:4000');
  const [player, setPlayer] = useState<PlayerControls | null>(null);

  const {
    playbackState,
    syncStatus,
    drift,
    clockSynced,
    getServerTime,
  } = usePlaybackSync(socket, player);

  const handlePlay = () => {
    if (socket && clockSynced) {
      socket.emit('sync:play', { atServerTime: getServerTime() });
    }
  };

  return (
    <div>
      <video ref={videoRef} />
      <button onClick={handlePlay} disabled={!clockSynced}>
        Play
      </button>
      <div>Status: {syncStatus}, Drift: {drift}ms</div>
    </div>
  );
}
```

## Testing

### Manual Testing

1. Open two browser windows side-by-side
2. Join the same room in both windows
3. Observe clock sync completing in both windows
4. Click "Play" in one window
5. Verify both videos start in sync
6. Check drift indicator stays green (< 300ms)
7. Artificially pause one video
8. Watch automatic correction kick in

### Unit Testing

Key test scenarios:

- Clock sync calculates correct offset
- Executor schedules future commands
- Executor executes immediate commands
- Checker detects drift correctly
- Soft resync adjusts playback rate
- Hard resync seeks to correct position
- Reconnection restores sync state

## Performance Considerations

### Network Latency

- Clock sync uses multiple samples to filter outliers
- Commands scheduled with clock-adjusted timing
- RTT measured and displayed to user

### CPU Usage

- Drift check runs once per second (configurable)
- Services properly cleaned up on unmount
- Scheduled commands cleared on disconnect

### Memory

- Command buffer limited in size
- Old samples discarded from clock sync
- Completed commands removed from executor

## Error Handling

### Clock Sync Failures

```typescript
const { error } = useClockSync(socket);

if (error) {
  // Show warning to user
  // Disable sync-dependent features
  // Retry sync
}
```

### Sync Command Failures

- Outdated commands (> 1s in past) logged as warnings
- Player errors caught and logged
- Sync status set to 'error' on persistent failures

### WebSocket Disconnection

- Clock sync resets on disconnect
- Periodic re-sync maintains accuracy
- Reconnection triggers fresh sync

## Future Enhancements

### Protocol Versioning

```typescript
interface ClientHello {
  protocolVersion: string;
  clientId: string;
  capabilities: string[];
}

interface ServerHello {
  protocolVersion: string;
  serverTime: number;
  roomState: PlaybackState;
  compatible: boolean;
  upgradeRequired?: boolean;
}
```

### Idempotency

```typescript
interface SyncCommand {
  id: string;              // UUID for idempotency
  sequenceNumber: number;  // Server-assigned
  idempotencyKey?: string; // Client-provided
  // ...
}
```

### Advanced Drift Prediction

- Machine learning to predict drift patterns
- Preemptive corrections
- Quality of service metrics

## References

- [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) - Section 4.2
- [WEBSOCKET.md](./WEBSOCKET.md) - WebSocket Events
- [ClockSync.ts](../frontend/src/lib/ClockSync.ts) - Clock sync implementation
- [usePlaybackSync.ts](../frontend/src/hooks/usePlaybackSync.ts) - Main integration hook
- [syncExecutor.service.ts](../frontend/src/services/syncExecutor.service.ts) - Command executor
- [syncChecker.service.ts](../frontend/src/services/syncChecker.service.ts) - Drift checker
