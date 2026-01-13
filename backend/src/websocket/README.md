# WebSocket Connection Handling with Socket.io

This module implements real-time WebSocket communication for SyncWatch using Socket.io.

## Features

- ✅ Socket.io integration with Fastify
- ✅ JWT authentication for authenticated users
- ✅ Guest connection support
- ✅ Room join/leave functionality
- ✅ Participant tracking in Redis
- ✅ Automatic heartbeat/ping-pong
- ✅ Reconnection handling
- ✅ State recovery on reconnection
- ✅ Error handling and logging
- ✅ Production-ready Redis database separation

## Architecture

### Namespace: `/sync`

All room synchronization events are handled in the `/sync` namespace.

### Events

#### Client → Server

- `room:join` - Join a room
  ```typescript
  {
    roomCode: string;      // 8-character room code
    password?: string;     // Room password (if required)
    guestName?: string;    // Guest name (required for guests)
  }
  ```

- `room:leave` - Leave current room
  ```typescript
  {}
  ```

#### Server → Client

- `room:state` - Current room state
  ```typescript
  {
    room: Room;
    participants: RoomParticipant[];
    playback: PlaybackState | null;
  }
  ```

- `room:participant:joined` - New participant joined
  ```typescript
  {
    participant: RoomParticipant;
  }
  ```

- `room:participant:left` - Participant left
  ```typescript
  {
    oderId: string;
  }
  ```

- `room:error` - Error occurred
  ```typescript
  {
    code: string;
    message: string;
  }
  ```

## Authentication

### Authenticated Users

Pass JWT token in the `auth` object during connection:

```typescript
const socket = io('http://localhost:4000/sync', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Guest Users

Connect without a token. Provide `guestName` when joining a room:

```typescript
const socket = io('http://localhost:4000/sync');

socket.emit('room:join', {
  roomCode: 'ABC12345',
  guestName: 'John Doe'
});
```

## Redis State Management

Room state is stored in Redis for fast access and cross-instance synchronization:

- `room:{roomId}:playback` - Playback state (JSON)
- `room:{roomId}:participants` - List of participants (JSON)
- `room:{roomId}:online` - Set of online socket IDs

All keys have TTL of 24 hours and are refreshed on updates.

## Connection Flow

1. Client connects to `/sync` namespace
2. Server validates JWT (if provided) or accepts as guest
3. Server assigns unique session ID
4. Client emits `room:join` with room code
5. Server validates room access and password
6. Server checks room capacity
7. Server creates participant record in database
8. Server adds participant to Redis state
9. Server sends current room state to client
10. Server broadcasts participant joined to others

## Disconnection Flow

1. Client disconnects or emits `room:leave`
2. Server removes participant from Redis state
3. Server removes participant from database
4. Server broadcasts participant left to others
5. Server cleans up socket data

## Error Handling

All errors are caught and sent to the client via `room:error` event with appropriate error codes:

- `ROOM_NOT_FOUND` - Room doesn't exist or expired
- `ROOM_FULL` - Room has reached max participants
- `INVALID_PASSWORD` - Wrong room password
- `UNAUTHORIZED` - Authentication failed
- `ALREADY_IN_ROOM` - User is already in a room
- `NOT_IN_ROOM` - User is not in a room
- `INVALID_TOKEN` - Invalid JWT token
- `INTERNAL_ERROR` - Server error

## Heartbeat

Socket.io automatically handles heartbeat/ping-pong with configurable intervals:

- Ping timeout: 10 seconds (configurable via `WS_PING_TIMEOUT`)
- Ping interval: 25 seconds (configurable via `WS_PING_INTERVAL`)

## Reconnection

Socket.io client automatically attempts reconnection with exponential backoff. Server maintains room state in Redis, allowing seamless state recovery when clients reconnect.

## Testing

Run tests with:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Environment Variables

Required environment variables:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:3000

# WebSocket
WS_PING_TIMEOUT=10000
WS_PING_INTERVAL=25000
```
