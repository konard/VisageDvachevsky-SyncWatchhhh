# SyncWatch WebSocket Events Documentation

## Overview

SyncWatch uses **Socket.io** for real-time communication over WebSockets. The WebSocket connection handles:
- Room participation (join/leave)
- Synchronized playback commands (play/pause/seek)
- Playback state synchronization
- Real-time notifications

**Namespace**: `/sync`

**Connection URL**: `ws://localhost:4000/sync` (development)

## Table of Contents

1. [Connection](#connection)
2. [Client → Server Events](#client--server-events)
3. [Server → Client Events](#server--client-events)
4. [Data Types](#data-types)
5. [Error Handling](#error-handling)
6. [Example Flows](#example-flows)

---

## Connection

### Authentication

WebSocket connections support both authenticated users and guests.

**Authenticated Connection:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/sync', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

**Guest Connection:**
```javascript
const socket = io('http://localhost:4000/sync');
// No auth token required for guests
```

### Connection Events

**Built-in Socket.io events:**

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

---

## Client → Server Events

Events that clients emit to the server.

### room:join

Join a room to start receiving synchronized playback commands.

**Payload:**
```typescript
{
  roomCode: string;        // 8-character room code
  password?: string;       // Optional, if room has password
  guestName?: string;      // Required for guest connections
}
```

**Example:**
```javascript
// Authenticated user
socket.emit('room:join', {
  roomCode: 'ABC12345',
  password: 'secret123'
});

// Guest user
socket.emit('room:join', {
  roomCode: 'ABC12345',
  guestName: 'Anonymous User'
});
```

**Response Events:**
- `room:state` - On successful join
- `room:error` - On failure

**Errors:**
- `ROOM_NOT_FOUND` - Invalid room code
- `INCORRECT_PASSWORD` - Wrong password
- `ROOM_FULL` - Max participants reached
- `GUEST_NAME_REQUIRED` - Guest must provide name

---

### room:leave

Leave the current room.

**Payload:** None

**Example:**
```javascript
socket.emit('room:leave');
```

**Response Events:**
- Socket automatically leaves the room
- Other participants receive `room:participant:left`

---

### sync:play

Send a play command to synchronize playback.

**Payload:**
```typescript
{
  sequenceNumber: number;  // Incrementing command counter
}
```

**Example:**
```javascript
socket.emit('sync:play', {
  sequenceNumber: 42
});
```

**Response Events:**
- `sync:command` - Broadcast to all room participants

**Permissions:**
- Only users with `canControl: true` can send this

**Errors:**
- `FORBIDDEN` - User cannot control playback
- `NOT_IN_ROOM` - Must join a room first

---

### sync:pause

Send a pause command to synchronize playback.

**Payload:**
```typescript
{
  sequenceNumber: number;
}
```

**Example:**
```javascript
socket.emit('sync:pause', {
  sequenceNumber: 43
});
```

**Response Events:**
- `sync:command` - Broadcast to all room participants

---

### sync:seek

Seek to a specific timestamp in the video.

**Payload:**
```typescript
{
  targetMediaTime: number;  // Target time in seconds
  sequenceNumber: number;
}
```

**Example:**
```javascript
socket.emit('sync:seek', {
  targetMediaTime: 120.5,  // Seek to 2:00.5
  sequenceNumber: 44
});
```

**Response Events:**
- `sync:command` - Broadcast to all room participants

**Validation:**
- `targetMediaTime` must be >= 0

---

### sync:rate

Change the playback rate (speed).

**Payload:**
```typescript
{
  rate: number;       // Playback speed multiplier (0.1 to 4.0)
  sequenceNumber: number;
}
```

**Example:**
```javascript
socket.emit('sync:rate', {
  rate: 1.5,  // 1.5x speed
  sequenceNumber: 45
});
```

**Response Events:**
- `sync:command` - Broadcast to all room participants

**Validation:**
- `rate` must be between 0.1 and 4.0

---

## Server → Client Events

Events that the server emits to clients.

### room:state

Sent when a user joins a room, providing the current room and playback state.

**Payload:**
```typescript
{
  room: {
    id: string;
    code: string;
    name: string;
    ownerId: string;
    maxParticipants: number;
    playbackControl: 'owner_only' | 'all' | 'selected';
    hasPassword: boolean;
    videoId?: string;
    youtubeVideoId?: string;
    externalUrl?: string;
  };
  participants: Array<{
    id: string;
    oderId: string;
    userId?: string;
    guestName?: string;
    role: 'owner' | 'participant' | 'guest';
    canControl: boolean;
    joinedAt: string;
    user?: {
      username: string;
      avatarUrl?: string;
    };
  }>;
  playbackState: {
    isPaused: boolean;
    mediaTime: number;
    rate: number;
    lastUpdatedAt: number;  // Server timestamp (ms)
  };
  currentParticipant: {
    id: string;
    role: string;
    canControl: boolean;
  };
}
```

**Example:**
```javascript
socket.on('room:state', (data) => {
  console.log('Room:', data.room.name);
  console.log('Participants:', data.participants.length);
  console.log('Playback state:', data.playbackState);
  console.log('You are:', data.currentParticipant.role);
});
```

**When Received:**
- Immediately after `room:join` succeeds

---

### room:participant:joined

Broadcast when a new participant joins the room.

**Payload:**
```typescript
{
  participant: {
    id: string;
    oderId: string;
    userId?: string;
    guestName?: string;
    role: 'owner' | 'participant' | 'guest';
    canControl: boolean;
    joinedAt: string;
    user?: {
      username: string;
      avatarUrl?: string;
    };
  };
}
```

**Example:**
```javascript
socket.on('room:participant:joined', (data) => {
  const name = data.participant.user?.username || data.participant.guestName;
  console.log(`${name} joined the room`);
});
```

**When Received:**
- All existing participants receive this when someone joins

---

### room:participant:left

Broadcast when a participant leaves the room.

**Payload:**
```typescript
{
  participantId: string;
  oderId: string;
}
```

**Example:**
```javascript
socket.on('room:participant:left', (data) => {
  console.log(`Participant ${data.participantId} left`);
});
```

**When Received:**
- All remaining participants receive this when someone leaves or disconnects

---

### sync:command

Broadcast playback command to all room participants.

**Payload (PLAY command):**
```typescript
{
  type: 'PLAY';
  atServerTime: number;     // When command was issued (server time, ms)
  sequenceNumber: number;
}
```

**Payload (PAUSE command):**
```typescript
{
  type: 'PAUSE';
  atServerTime: number;
  sequenceNumber: number;
}
```

**Payload (SEEK command):**
```typescript
{
  type: 'SEEK';
  targetMediaTime: number;  // Target position in seconds
  atServerTime: number;
  sequenceNumber: number;
}
```

**Payload (SET_RATE command):**
```typescript
{
  type: 'SET_RATE';
  rate: number;             // Playback speed (0.1 to 4.0)
  atServerTime: number;
  sequenceNumber: number;
}
```

**Example:**
```javascript
socket.on('sync:command', (command) => {
  switch (command.type) {
    case 'PLAY':
      videoPlayer.play();
      break;
    case 'PAUSE':
      videoPlayer.pause();
      break;
    case 'SEEK':
      videoPlayer.currentTime = command.targetMediaTime;
      break;
    case 'SET_RATE':
      videoPlayer.playbackRate = command.rate;
      break;
  }
});
```

**When Received:**
- All participants (including sender) receive this when any sync command is emitted

**Clock Synchronization:**
- Use `atServerTime` to calculate precise playback position
- Account for network latency and local clock drift

---

### sync:state

State snapshot for synchronization (sent periodically or on request).

**Payload:**
```typescript
{
  type: 'STATE_SNAPSHOT';
  state: {
    isPaused: boolean;
    mediaTime: number;      // Current position in seconds
    rate: number;           // Playback speed
    lastUpdatedAt: number;  // Server timestamp (ms)
  };
}
```

**Example:**
```javascript
socket.on('sync:state', (snapshot) => {
  const { isPaused, mediaTime, rate, lastUpdatedAt } = snapshot.state;

  // Calculate current position accounting for time since update
  const now = Date.now();
  const elapsedMs = now - lastUpdatedAt;
  const currentTime = isPaused
    ? mediaTime
    : mediaTime + (elapsedMs / 1000) * rate;

  videoPlayer.currentTime = currentTime;
  videoPlayer.playbackRate = rate;
  if (isPaused) {
    videoPlayer.pause();
  } else {
    videoPlayer.play();
  }
});
```

**When Received:**
- Periodically to keep clients in sync
- When clients experience significant drift

---

### room:error

Error notification for room or sync operations.

**Payload:**
```typescript
{
  code: string;            // Error code
  message: string;         // Human-readable message
  details?: object;        // Additional context
}
```

**Example:**
```javascript
socket.on('room:error', (error) => {
  console.error(`Error [${error.code}]:`, error.message);

  switch (error.code) {
    case 'ROOM_NOT_FOUND':
      alert('Room does not exist');
      break;
    case 'INCORRECT_PASSWORD':
      alert('Wrong password');
      break;
    case 'ROOM_FULL':
      alert('Room is full');
      break;
    case 'FORBIDDEN':
      alert('You cannot control playback');
      break;
  }
});
```

**Error Codes:**
- `ROOM_NOT_FOUND` - Room doesn't exist
- `INCORRECT_PASSWORD` - Wrong password
- `ROOM_FULL` - Max participants reached
- `GUEST_NAME_REQUIRED` - Guest must provide name
- `FORBIDDEN` - No permission for action
- `NOT_IN_ROOM` - Must join room first
- `VALIDATION_ERROR` - Invalid input

---

## Data Types

### PlaybackState

```typescript
interface PlaybackState {
  isPaused: boolean;
  mediaTime: number;       // Current position in seconds
  rate: number;            // Playback speed (0.1 to 4.0)
  lastUpdatedAt: number;   // Server timestamp (ms)
}
```

### SyncCommand

```typescript
type SyncCommand =
  | { type: 'PLAY'; atServerTime: number; sequenceNumber: number; }
  | { type: 'PAUSE'; atServerTime: number; sequenceNumber: number; }
  | { type: 'SEEK'; targetMediaTime: number; atServerTime: number; sequenceNumber: number; }
  | { type: 'SET_RATE'; rate: number; atServerTime: number; sequenceNumber: number; }
  | { type: 'STATE_SNAPSHOT'; state: PlaybackState; };
```

### Participant

```typescript
interface Participant {
  id: string;              // Participant ID
  oderId: string;          // Order ID for display sorting
  userId?: string;         // User ID (null for guests)
  guestName?: string;      // Guest display name
  role: 'owner' | 'participant' | 'guest';
  canControl: boolean;     // Can send sync commands
  joinedAt: string;        // ISO 8601 timestamp
  user?: {
    username: string;
    avatarUrl?: string;
  };
}
```

---

## Error Handling

### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Failed to connect:', error);
  // Retry connection with exponential backoff
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server forcefully disconnected (kicked or banned)
    console.log('Disconnected by server');
  } else if (reason === 'transport close') {
    // Network issue, auto-reconnect
    console.log('Connection lost, reconnecting...');
  }
});
```

### Operation Errors

```javascript
socket.on('room:error', (error) => {
  // Handle room-specific errors
  console.error('Room error:', error);
});
```

### Timeout Handling

```javascript
function joinRoomWithTimeout(roomCode, password) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Join room timed out'));
    }, 5000);

    socket.once('room:state', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });

    socket.once('room:error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.emit('room:join', { roomCode, password });
  });
}
```

---

## Example Flows

### Flow 1: User Joins Room and Receives State

```
Client                          Server                          Other Clients
  |                               |                                   |
  |---> room:join --------------->|                                   |
  |     (code, password)          |                                   |
  |                               |--- Validate & join room           |
  |<--- room:state --------------|                                   |
  |     (room, participants,      |                                   |
  |      playback state)          |                                   |
  |                               |---> room:participant:joined ----->|
  |                               |     (new participant info)        |
```

### Flow 2: User Sends Play Command

```
Client                          Server                          Other Clients
  |                               |                                   |
  |---> sync:play --------------->|                                   |
  |     (sequenceNumber: 42)      |                                   |
  |                               |--- Validate permissions           |
  |                               |--- Update Redis state             |
  |<--- sync:command -------------|                                   |
  |     (type: PLAY,              |---> sync:command ---------------->|
  |      atServerTime,            |     (type: PLAY,                  |
  |      sequenceNumber: 42)      |      atServerTime,                |
  |                               |      sequenceNumber: 42)          |
  |--- Video plays                |                                   |--- Video plays
```

### Flow 3: User Disconnects

```
Client                          Server                          Other Clients
  |                               |                                   |
  |--- disconnect --------------->|                                   |
  |                               |--- Remove from room               |
  |                               |---> room:participant:left ------->|
  |                               |     (participantId)               |
  |                               |                                   |--- Update UI
```

### Flow 4: Clock Synchronization

```javascript
// Client-side: Calculate current playback position
function calculateCurrentTime(playbackState) {
  const { isPaused, mediaTime, rate, lastUpdatedAt } = playbackState;

  if (isPaused) {
    return mediaTime;
  }

  const serverNow = Date.now(); // Assumes clock sync
  const elapsedMs = serverNow - lastUpdatedAt;
  const elapsedSec = elapsedMs / 1000;

  return mediaTime + (elapsedSec * rate);
}

// Example usage
socket.on('sync:command', (command) => {
  if (command.type === 'PLAY') {
    // Get current state and calculate position
    const currentTime = calculateCurrentTime(currentPlaybackState);
    videoPlayer.currentTime = currentTime;
    videoPlayer.play();
  }
});
```

---

## Best Practices

### 1. Sequence Numbers

Always track and increment sequence numbers to handle out-of-order commands:

```javascript
let sequenceNumber = 0;

function sendPlayCommand() {
  socket.emit('sync:play', {
    sequenceNumber: ++sequenceNumber
  });
}
```

### 2. Debounce Seek Commands

Avoid spamming seek commands during scrubbing:

```javascript
import { debounce } from 'lodash';

const sendSeekCommand = debounce((targetTime) => {
  socket.emit('sync:seek', {
    targetMediaTime: targetTime,
    sequenceNumber: ++sequenceNumber
  });
}, 200); // 200ms debounce

videoPlayer.addEventListener('seeking', () => {
  sendSeekCommand(videoPlayer.currentTime);
});
```

### 3. Handle Reconnection

Rejoin room after reconnection:

```javascript
socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('connect', () => {
  console.log('Reconnected');

  // Rejoin last room
  if (currentRoomCode) {
    socket.emit('room:join', {
      roomCode: currentRoomCode,
      password: currentPassword
    });
  }
});
```

### 4. Sync Drift Correction

Periodically check and correct drift:

```javascript
setInterval(() => {
  const expectedTime = calculateCurrentTime(currentPlaybackState);
  const actualTime = videoPlayer.currentTime;
  const drift = Math.abs(expectedTime - actualTime);

  if (drift > 0.3) { // 300ms threshold
    console.log(`Drift detected: ${drift}s, correcting...`);
    videoPlayer.currentTime = expectedTime;
  }
}, 1000); // Check every second
```

---

## Rate Limiting

WebSocket sync commands are rate limited:
- **Limit**: 10 commands per second per user
- **Window**: Rolling 1-second window

Exceeding the limit results in `RATE_LIMIT_EXCEEDED` error.

---

## TypeScript Definitions

Full TypeScript types are available in `/shared/types/socket.ts`:

```typescript
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData
} from '@syncwatch/shared/types/socket';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('/sync');
```

---

## Testing WebSocket Events

Use the `socket.io-client` library to test events:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/sync');

socket.on('connect', () => {
  console.log('Connected');

  socket.emit('room:join', {
    roomCode: 'TEST1234',
    guestName: 'Test User'
  });
});

socket.on('room:state', (data) => {
  console.log('Joined room:', data);

  socket.emit('sync:play', { sequenceNumber: 1 });
});

socket.on('sync:command', (cmd) => {
  console.log('Received command:', cmd);
});
```

For automated testing, see the test suite in `/backend/src/websocket/__tests__/`.
