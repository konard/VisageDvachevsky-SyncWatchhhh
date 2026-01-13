# SyncWatch - Technical Specification

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
   - [2.3 Redis Database Separation](#23-redis-database-separation-production)
   - [2.4 Socket.io Considerations & Scaling Path](#24-socketio-considerations--scaling-path)
3. [Technology Stack](#3-technology-stack)
   - [3.4 Production Infrastructure (Required)](#34-production-infrastructure-required)
   - [3.5 Future Scaling (v2)](#35-future-scaling-v2)
4. [Feature Specifications](#4-feature-specifications)
   - [4.1.3 Owner Failover & Room Recovery](#413-owner-failover--room-recovery-production-required)
   - [4.2 Video Synchronization Protocol (Versioned)](#42-video-synchronization-protocol)
   - [4.3.3 TURN/STUN Configuration (MANDATORY)](#433-turnstun-configuration-mandatory)
   - [4.5 Video Sources Policy](#45-video-sources-policy)
   - [4.6.4 FFmpeg Health & Watchdog](#464-ffmpeg-health--watchdog-production-required)
   - [4.6.5 CDN / Edge Delivery](#465-cdn--edge-delivery-production-required)
5. [API Design](#5-api-design)
6. [Database Schema](#6-database-schema)
7. [Security Considerations](#7-security-considerations)
8. [Observability (Production Required)](#8-observability-production-required)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Work Plan](#10-work-plan)

---

## 1. Project Overview

### 1.1 Summary
SyncWatch is a web application for synchronized video watching with up to 5 participants. It features real-time video synchronization, text chat, voice chat, and a modern "liquid glass" UI design.

### 1.2 Core Features
- **Room Management**: Create/join rooms with invite links
- **Video Sources**: File upload (transcoded), YouTube embed, external sites (best effort)
- **Synchronization**: Sub-300ms sync across participants
- **Text Chat**: Real-time messaging (authenticated users only)
- **Voice Chat**: WebRTC audio with PTT and VAD modes
- **User Accounts**: Registration/login with friend system

### 1.3 Constraints
- Maximum 5 participants per room
- Video duration limit: 3 hours
- Upload size limit: 8 GB
- Browser-based (desktop/mobile/tablet)
- Free service (no monetization)

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   React SPA     │  │   Video Player  │  │   WebRTC Audio Client       │  │
│  │   (Vite + TS)   │  │   (HLS.js/YT)   │  │   (P2P Mesh / SFU ready)    │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
│           └────────────────────┼──────────────────────────┘                  │
│                                │                                             │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │     NGINX / Traefik     │
                    │   (Reverse Proxy + TLS) │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                          API GATEWAY                                         │
│  ┌─────────────────────────────┴─────────────────────────────────────────┐  │
│  │                    Node.js (Express/Fastify)                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │  REST API    │  │  WebSocket   │  │  Signaling   │                │  │
│  │  │  (Auth,Room) │  │  (Sync,Chat) │  │  (WebRTC)    │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                          SERVICE LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Room Service │  │ Sync Engine  │  │ Chat Service │  │  Transcoding     │ │
│  │              │  │ (State Mgr)  │  │              │  │  Worker (FFmpeg) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
└─────────┼─────────────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                 │                   │
┌─────────┼─────────────────┼─────────────────┼───────────────────┼────────────┐
│         │           DATA LAYER              │                   │            │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────┴──────────┐ │
│  │  PostgreSQL  │  │    Redis     │  │    Redis     │  │   MinIO / S3     │ │
│  │  (Accounts,  │  │  (Sessions,  │  │   Pub/Sub    │  │  (Video Files,   │ │
│  │   Rooms)     │  │   State)     │  │  (Messages)  │  │   HLS Segments)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Frontend (React SPA)
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (lightweight, perfect for real-time apps)
- **Styling**: Tailwind CSS + custom liquid-glass components
- **Video**: HLS.js for uploaded videos, YouTube IFrame API
- **WebRTC**: Native browser API + simple-peer for voice chat
- **WebSocket**: Socket.io-client for sync and chat

#### 2.2.2 Backend (Node.js)
- **Framework**: Fastify (faster than Express, better TypeScript support)
- **WebSocket**: Socket.io (rooms, namespaces, reconnection handling)
- **Authentication**: JWT + bcrypt, optional OAuth
- **Validation**: Zod schemas
- **ORM**: Prisma (PostgreSQL)

#### 2.2.3 Transcoding Service
- **FFmpeg**: Containerized worker for video transcoding
- **Output**: HLS (H.264 + AAC) with adaptive bitrate
- **Queue**: Bull (Redis-based job queue)
- **Storage**: MinIO (S3-compatible, self-hosted)

#### 2.2.4 Data Stores
- **PostgreSQL**: Users, rooms, friendships, persistent data
- **Redis**: Sessions, room state, pub/sub for horizontal scaling (see 2.3 for DB separation)
- **MinIO/S3**: Video files, HLS segments

### 2.3 Redis Database Separation (Production)

> **Important**: For production maturity, Redis responsibilities should be logically separated.
> This prevents one concern from affecting others and simplifies debugging.

**Logical DB Separation**:
```
Redis DB 0 - Realtime State (room state, playback position, presence)
Redis DB 1 - Pub/Sub (cross-instance message broadcast)
Redis DB 2 - Rate Limiting (request throttling per IP/user)
Redis DB 3 - BullMQ Jobs (transcoding queue)
Redis DB 4 - Sessions (refresh tokens, socket sessions)
```

**Configuration**:
```typescript
// config/redis.ts
export const redisConfig = {
  state: {
    db: 0,
    keyPrefix: 'state:',
    // Room state: room:{roomId}:playback
    // Presence: room:{roomId}:participants
  },
  pubsub: {
    db: 1,
    // Dedicated connection for pub/sub (required by Redis)
    // Channels: sync:{roomId}, chat:{roomId}, voice:{roomId}
  },
  rateLimit: {
    db: 2,
    keyPrefix: 'rl:',
    // Keys: rl:ip:{ip}, rl:user:{userId}
  },
  queue: {
    db: 3,
    keyPrefix: 'bull:',
    // BullMQ uses this for job storage
  },
  session: {
    db: 4,
    keyPrefix: 'sess:',
    // Socket session mapping, refresh tokens
  },
};
```

**Benefits**:
- Isolated concerns: queue flush doesn't affect realtime state
- Clear key ownership per database
- Easier monitoring and debugging
- Can scale different concerns independently

### 2.4 Socket.io Considerations & Scaling Path

> **Socket.io is excellent for MVP** but has known scaling limitations.
> This section documents the trade-offs and future migration path.

**Why Socket.io for MVP**:
- Automatic reconnection with exponential backoff
- Room abstraction for broadcasting
- Built-in acknowledgments and timeouts
- Large ecosystem and documentation

**Known Limitations at Scale**:
- Sticky sessions required for horizontal scaling
- Memory overhead per connection (~40KB)
- Pub/Sub adapter adds latency
- Harder to debug than raw WebSockets

**Socket.io Adapter Configuration**:
```typescript
// Required for horizontal scaling
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = createClient({ url: REDIS_URL, db: 1 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Future Migration Path (v2)**:
```
Current (MVP):     Socket.io → Redis Pub/Sub → Socket.io
                        ↓
Future Option 1:   uWebSockets.js (3-10x faster, lower memory)
                        ↓
Future Option 2:   NATS/Redis Streams as event bus
                   + lightweight WS wrapper
```

**Namespace Isolation** (Current architecture):
```typescript
// Keep sync/chat/voice logically separated
const syncNamespace = io.of('/sync');   // Playback sync events
const chatNamespace = io.of('/chat');   // Text messages
const voiceNamespace = io.of('/voice'); // WebRTC signaling

// Benefits:
// - Independent scaling per concern
// - Easier to migrate one namespace at a time
// - Clear event ownership
```

---

## 3. Technology Stack

### 3.1 Frontend
| Category | Technology | Justification |
|----------|------------|---------------|
| Framework | React 18 + TypeScript | Component-based, large ecosystem, type safety |
| Build | Vite | Fast HMR, excellent DX, ESM-native |
| State | Zustand | Minimal boilerplate, great for real-time updates |
| Styling | Tailwind CSS | Utility-first, rapid UI development |
| Animations | Framer Motion | Smooth, declarative animations |
| Video | HLS.js | Cross-browser HLS support |
| WebRTC | simple-peer | Simplified WebRTC API |
| HTTP | Axios | Request/response interceptors |
| WebSocket | Socket.io-client | Auto-reconnection, room support |
| Forms | React Hook Form + Zod | Performant forms with validation |
| Icons | Lucide React | Beautiful, consistent icons |
| Audio | Web Audio API | Visualizations, volume control |

### 3.2 Backend
| Category | Technology | Justification |
|----------|------------|---------------|
| Runtime | Node.js 20 LTS | JavaScript everywhere, large ecosystem |
| Framework | Fastify | High performance, plugin architecture |
| WebSocket | Socket.io | Battle-tested, reconnection, rooms |
| ORM | Prisma | Type-safe queries, migrations |
| Queue | Bull | Redis-based, reliable job processing |
| Validation | Zod | Shared schemas with frontend |
| Auth | JWT + bcrypt | Stateless, secure |
| Logging | Pino | Fast, structured logging |
| Testing | Vitest + Supertest | Fast, compatible with Vite |

### 3.3 Infrastructure
| Category | Technology | Justification |
|----------|------------|---------------|
| Database | PostgreSQL 15 | Reliable, feature-rich RDBMS |
| Cache/Pubsub | Redis 7 | Sessions, real-time state, pub/sub |
| Object Storage | MinIO | S3-compatible, self-hosted |
| Transcoding | FFmpeg | Industry standard, all formats |
| Reverse Proxy | Nginx / Traefik | TLS termination, load balancing |
| Containers | Docker + Compose | Consistent environments |
| CI/CD | GitHub Actions | Integrated with repository |

### 3.4 Production Infrastructure (Required)

> **Note**: These components are NOT optional for production deployment. They are listed separately because they require additional infrastructure considerations.

| Category | Technology | Justification |
|----------|------------|---------------|
| TURN/STUN | Coturn | **MANDATORY** for WebRTC NAT traversal. Without TURN, voice chat fails for corporate NAT, mobile operators (CGNAT), closed Wi-Fi networks |
| CDN | CloudFlare / BunnyCDN / nginx cache | Required for HLS segment delivery at scale |
| Monitoring | Prometheus + Grafana | Production metrics (sync drift, ICE failures, job durations) |
| Tracing | OpenTelemetry | Distributed tracing for debugging production issues |

### 3.5 Future Scaling (v2)
| Category | Technology | Use Case |
|----------|------------|----------|
| SFU | LiveKit (recommended) / mediasoup | Scalable voice when P2P mesh becomes insufficient |
| WebSocket | uWebSockets / native WS | Higher performance alternative to Socket.io |
| Event Bus | NATS / Redis Streams | Decoupled event-driven architecture |

---

## 4. Feature Specifications

### 4.1 Room Management

#### 4.1.1 Room Creation
```typescript
interface CreateRoomRequest {
  name?: string;
  maxParticipants: 2 | 3 | 4 | 5;
  password?: string;
  playbackControl: 'owner_only' | 'all' | 'selected';
}

interface Room {
  id: string;
  code: string; // 8-char invite code
  name: string;
  ownerId: string;
  maxParticipants: number;
  passwordHash?: string;
  playbackControl: string;
  createdAt: Date;
  expiresAt: Date; // Auto-cleanup
}
```

#### 4.1.2 Room States
```
CREATED → WAITING → PLAYING → PAUSED → ENDED
                         ↓
                    OWNER_AWAY (heartbeat timeout)
                         ↓
                    AUTO_HANDOVER (if enabled)
```

#### 4.1.3 Owner Failover & Room Recovery (Production Required)

> **Problem**: What happens when the Owner closes their browser or loses network connection?
> Without handling this, the room becomes unusable for other participants.

**Owner Heartbeat**:
```typescript
interface OwnerHeartbeat {
  roomId: string;
  ownerId: string;
  lastHeartbeatAt: number;  // Server timestamp
  heartbeatIntervalMs: 5000;  // Every 5 seconds
  timeoutMs: 15000;  // Mark as "away" after 15s
}

// Client sends heartbeat
socket.emit('owner:heartbeat', { roomId });

// Server checks heartbeat
function checkOwnerHeartbeat(roomId: string) {
  const heartbeat = await redis.get(`room:${roomId}:owner:heartbeat`);
  const elapsed = Date.now() - heartbeat.lastHeartbeatAt;

  if (elapsed > OWNER_TIMEOUT_MS) {
    await markOwnerAway(roomId);
  }
}
```

**Auto-Handover Rules**:
```typescript
interface HandoverPolicy {
  enabled: boolean;  // Room setting, default: true
  handoverOrder: 'join_order' | 'explicit_delegate';

  // Who becomes owner if current owner is away
  getNextOwner(participants: Participant[]): Participant | null;
}

// Handover flow
async function handleOwnerTimeout(roomId: string) {
  const room = await getRoom(roomId);
  const participants = await getActiveParticipants(roomId);

  if (!room.handoverPolicy.enabled) {
    // Pause playback, notify participants
    await pausePlayback(roomId, 'owner_away');
    await broadcast(roomId, 'room:owner_away', {
      message: 'Owner disconnected. Waiting for reconnect...',
    });
    return;
  }

  // Auto-handover to next eligible participant
  const newOwner = room.handoverPolicy.getNextOwner(participants);
  if (newOwner) {
    await transferOwnership(roomId, newOwner.id);
    await broadcast(roomId, 'room:owner_changed', {
      newOwnerId: newOwner.id,
      reason: 'auto_handover',
    });
  }
}
```

**Owner Reconnection**:
```typescript
interface ReconnectionState {
  roomId: string;
  userId: string;
  wasOwner: boolean;
  disconnectedAt: number;
  reconnectionWindowMs: 60000;  // 1 minute to reclaim ownership
}

async function handleOwnerReconnect(roomId: string, userId: string) {
  const reconnectionState = await redis.get(`reconnect:${roomId}:${userId}`);

  if (reconnectionState?.wasOwner) {
    const elapsed = Date.now() - reconnectionState.disconnectedAt;

    if (elapsed < RECONNECTION_WINDOW_MS) {
      // Offer to reclaim ownership
      socket.emit('room:offer_ownership', {
        roomId,
        currentOwner: await getCurrentOwner(roomId),
        canReclaim: true,
      });
    }
  }
}
```

**Room Recovery on Client Reconnect**:
```typescript
// Client reconnection flow
async function handleClientReconnect(socket: Socket, roomId: string) {
  // 1. Send current state snapshot
  const state = await getPlaybackState(roomId);
  socket.emit('sync:state_snapshot', state);

  // 2. Send recent commands (for catch-up)
  const recentCommands = await getRecentCommands(roomId, lastSeenSequence);
  socket.emit('sync:catchup', recentCommands);

  // 3. Restore chat position
  const missedMessages = await getMessagesSince(roomId, lastMessageId);
  socket.emit('chat:catchup', missedMessages);

  // 4. Re-establish voice connections
  socket.emit('voice:reconnect', { peers: await getActivePeers(roomId) });
}
```

### 4.2 Video Synchronization Protocol

> **Protocol Versioning**: For a mature production system, sync protocol needs explicit versioning,
> sequence numbers, and idempotency guarantees to handle race conditions and out-of-order events.

#### 4.2.1 Protocol Version
```typescript
const SYNC_PROTOCOL_VERSION = '1.0.0';

// Version negotiation on connect
interface ClientHello {
  protocolVersion: string;
  clientId: string;
  capabilities: string[];  // ['seek', 'rate_change', 'voice']
}

interface ServerHello {
  protocolVersion: string;
  serverTime: number;
  roomState: PlaybackState;
  compatible: boolean;
  upgradeRequired?: boolean;
}
```

#### 4.2.2 Server State
```typescript
interface PlaybackState {
  roomId: string;
  sourceType: 'upload' | 'youtube' | 'external';
  sourceId: string; // videoId or manifestUrl
  isPlaying: boolean;
  playbackRate: number;
  anchorServerTimeMs: number;  // Server timestamp
  anchorMediaTimeMs: number;   // Media position at anchor
  sequenceNumber: number;      // Monotonic, prevents race conditions
  protocolVersion: string;     // For backward compatibility
}
```

#### 4.2.3 Sync Commands with Idempotency
```typescript
interface SyncCommandBase {
  id: string;              // UUID for idempotency
  sequenceNumber: number;  // Monotonic, server-assigned
  atServerTime: number;    // When to execute
  issuedBy: string;        // User who issued command
  idempotencyKey?: string; // Client-provided for deduplication
}

type SyncCommand =
  | SyncCommandBase & { type: 'PLAY' }
  | SyncCommandBase & { type: 'PAUSE' }
  | SyncCommandBase & { type: 'SEEK'; targetMediaTime: number }
  | SyncCommandBase & { type: 'SET_RATE'; rate: number }
  | SyncCommandBase & { type: 'STATE_SNAPSHOT'; state: PlaybackState };
```

#### 4.2.4 Idempotency & Deduplication
```typescript
// Server-side idempotency handling
class SyncCommandProcessor {
  private processedCommands = new Map<string, number>(); // id -> timestamp
  private lastSequenceNumber = 0;

  async processCommand(command: SyncCommand): Promise<ProcessResult> {
    // 1. Check for duplicate by idempotency key
    if (command.idempotencyKey) {
      const existing = await redis.get(`idempotent:${command.idempotencyKey}`);
      if (existing) {
        return { status: 'duplicate', originalResult: JSON.parse(existing) };
      }
    }

    // 2. Check for duplicate by command ID
    if (this.processedCommands.has(command.id)) {
      return { status: 'already_processed' };
    }

    // 3. Check sequence number (reject stale commands)
    if (command.sequenceNumber <= this.lastSequenceNumber) {
      return { status: 'stale', message: 'Command is older than current state' };
    }

    // 4. Process command
    const result = await this.executeCommand(command);

    // 5. Store for idempotency
    this.processedCommands.set(command.id, Date.now());
    if (command.idempotencyKey) {
      await redis.setex(
        `idempotent:${command.idempotencyKey}`,
        3600, // 1 hour TTL
        JSON.stringify(result)
      );
    }

    this.lastSequenceNumber = command.sequenceNumber;
    return { status: 'processed', result };
  }
}
```

#### 4.2.5 Out-of-Order Event Handling
```typescript
// Client-side command buffer for out-of-order handling
class CommandBuffer {
  private buffer: SyncCommand[] = [];
  private lastAppliedSequence = 0;

  receive(command: SyncCommand) {
    // Add to buffer, sorted by sequence number
    this.buffer.push(command);
    this.buffer.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    // Process all consecutive commands
    this.processBuffer();
  }

  private processBuffer() {
    while (this.buffer.length > 0) {
      const next = this.buffer[0];

      if (next.sequenceNumber === this.lastAppliedSequence + 1) {
        // Next in sequence - apply it
        this.apply(next);
        this.buffer.shift();
        this.lastAppliedSequence = next.sequenceNumber;
      } else if (next.sequenceNumber <= this.lastAppliedSequence) {
        // Already applied - discard
        this.buffer.shift();
      } else {
        // Gap in sequence - wait for missing commands
        // Request missing commands after timeout
        this.scheduleMissingCommandsRequest(
          this.lastAppliedSequence + 1,
          next.sequenceNumber - 1
        );
        break;
      }
    }
  }
}
```

#### 4.2.6 Client Algorithm
```
1. Receive command with atServerTime
2. Check sequence number - buffer if out of order
3. Calculate localTime = atServerTime - clockOffset
4. If localTime is in future:
   - Schedule action at localTime
5. If localTime is in past (by small margin):
   - Execute immediately with position compensation
6. Periodically check sync:
   - Calculate expected position: anchorMediaTime + (now - anchorServerTime)
   - Get actual player position
   - If |delta| < 200ms: adjust rate (1.02 or 0.98)
   - If |delta| >= 500ms: hard seek
7. Acknowledge command receipt (for metrics/reliability)
```

#### 4.2.7 Race Condition Prevention
```typescript
// Optimistic locking for concurrent control requests
interface ControlRequest {
  roomId: string;
  command: SyncCommand;
  expectedSequence: number;  // Client's last known sequence
}

async function handleControlRequest(request: ControlRequest) {
  const currentSequence = await redis.get(`room:${request.roomId}:sequence`);

  if (request.expectedSequence !== currentSequence) {
    // Stale request - client has outdated state
    return {
      status: 'conflict',
      currentSequence,
      message: 'Room state has changed. Please retry.',
    };
  }

  // Atomically increment and apply
  const newSequence = await redis.incr(`room:${request.roomId}:sequence`);
  const command = { ...request.command, sequenceNumber: newSequence };

  await broadcastCommand(request.roomId, command);
  return { status: 'applied', sequenceNumber: newSequence };
}
```

### 4.3 Voice Chat

#### 4.3.1 Architecture
For 5 participants, P2P mesh creates 10 connections (n*(n-1)/2).
This is acceptable for MVP but has known limitations in production.

```
Participant A ←→ Participant B
      ↑   ↘    ↗    ↑
      │     ↘↗      │
      ↓    ↗  ↘     ↓
Participant C ←→ Participant D
           ↖   ↗
             E
```

**P2P Mesh Limitations (documented for v2 transition)**:
- High CPU load on mobile devices (each peer encodes/decodes N-1 streams)
- Network traffic grows as N×(N-1)
- Instability during join/leave events (ICE renegotiation)
- NAT traversal requires TURN server (see 4.3.3)

**Planned v2 Migration Path**: Transition to SFU architecture
- **Recommended**: LiveKit (production-ready, excellent DX, built-in TURN)
- **Alternative**: mediasoup (flexible but more complex ops)

This migration path is explicitly documented as an architectural decision.

#### 4.3.2 Audio Modes
```typescript
interface VoiceSettings {
  mode: 'push_to_talk' | 'voice_activity';
  pttKey?: string; // e.g., 'Space', 'KeyV'
  vadThreshold?: number; // 0-1, sensitivity
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}
```

#### 4.3.3 TURN/STUN Configuration (MANDATORY)

> ⚠️ **CRITICAL**: WebRTC P2P without TURN server does NOT work reliably in production.
>
> **Failure scenarios without TURN**:
> - Corporate NAT / firewalls
> - Mobile operators with CGNAT
> - Symmetric NAT environments
> - Restrictive Wi-Fi networks (hotels, airports, offices)

**ICE Server Configuration**:
```typescript
interface IceServerConfig {
  urls: string[];           // STUN/TURN server URLs
  username?: string;        // TURN credentials
  credential?: string;      // TURN password
  credentialType?: 'password' | 'oauth';
}

// Production ICE configuration
const iceServers: IceServerConfig[] = [
  // Public STUN (fallback only)
  { urls: 'stun:stun.l.google.com:19302' },

  // Self-hosted coturn (primary)
  {
    urls: [
      'turn:turn.syncwatch.example:3478?transport=udp',
      'turn:turn.syncwatch.example:3478?transport=tcp',
      'turns:turn.syncwatch.example:5349?transport=tcp'  // TLS fallback
    ],
    username: '<dynamic-username>',      // Rotated credentials
    credential: '<time-limited-token>',  // Short-lived (recommended: HMAC-based)
    credentialType: 'password'
  }
];
```

**Coturn Credential Rotation**:
```typescript
// Server-side credential generation (TURN REST API style)
function generateTurnCredentials(userId: string, ttlSeconds: number = 86400) {
  const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${timestamp}:${userId}`;
  const credential = crypto
    .createHmac('sha1', process.env.TURN_SECRET)
    .update(username)
    .digest('base64');

  return { username, credential, ttl: ttlSeconds };
}
```

**ICE Fallback Strategy**:
1. Try STUN (UDP) → fastest, works for simple NAT
2. Try TURN (UDP) → works for most restrictive NATs
3. Try TURN (TCP) → fallback for UDP-blocked networks
4. Try TURNS (TLS over TCP) → last resort for heavily firewalled networks

### 4.4 Text Chat

#### 4.4.1 Message Types
```typescript
type ChatMessage =
  | { type: 'user'; userId: string; content: string; timestamp: number }
  | { type: 'system'; event: SystemEvent; timestamp: number };

type SystemEvent =
  | { kind: 'join'; userId: string; username: string }
  | { kind: 'leave'; userId: string; username: string }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'seek'; position: number };
```

### 4.5 Video Sources Policy

> **Important**: This section explicitly defines what video sources are supported and how.
> Designed to set correct user expectations and avoid legal/technical issues.

#### 4.5.1 Supported Video Sources

| Source Type | Support Level | Implementation |
|-------------|--------------|----------------|
| **File Upload** | Full | Server-side transcoding to HLS |
| **YouTube** | Official Only | YouTube IFrame API embed |
| **Direct URLs** | Whitelist | Direct m3u8/mp4 links only |
| **External Sites** | Limited | Explicit whitelist, official embeds |

#### 4.5.2 YouTube Policy (PRIMARY USE CASE)

**What we DO**:
- Use official YouTube IFrame Player API
- Synchronize play/pause/seek via YouTube Player API
- Respect YouTube's embed restrictions

**What we DO NOT do**:
- Extract raw video streams
- Bypass DRM or signatures
- Violate YouTube Terms of Service

**Sync Limitations Disclosure**:
```typescript
interface YouTubeSourceInfo {
  videoId: string;
  syncPrecision: 'high' | 'medium' | 'degraded';
  warning?: string;  // e.g., "Exact sync may vary ±500ms for this video"
}
```

Some YouTube videos may have reduced sync precision due to:
- Live streams (inherent latency)
- Age-restricted content (limited API access)
- Geo-restricted content

#### 4.5.3 External Sites Policy

> ⚠️ **"Best Effort" means graceful failure, not guaranteed support**

**Whitelist-based approach**:
```typescript
// Supported external providers (explicit whitelist)
const SUPPORTED_PROVIDERS = {
  // Official embed APIs
  'vimeo.com': { type: 'official_embed', syncSupport: 'full' },
  'dailymotion.com': { type: 'official_embed', syncSupport: 'partial' },

  // Direct stream URLs only
  'direct_m3u8': { type: 'direct_stream', syncSupport: 'full' },
  'direct_mp4': { type: 'direct_stream', syncSupport: 'full' },
};

// NOT SUPPORTED (with clear user messaging)
// - Sites with X-Frame-Options: DENY
// - Sites with restrictive CSP
// - DRM-protected content (Netflix, Disney+, etc.)
// - Sites requiring authentication
```

**User-facing behavior when site is not supported**:
```typescript
interface VideoSourceValidation {
  isSupported: boolean;
  reason?: 'x_frame_options' | 'csp_blocked' | 'drm_protected' | 'unknown_provider';
  suggestion?: string;  // "Try uploading the video file instead"
}
```

**Clear rejection with alternatives**:
- Show specific reason why embedding failed
- Suggest "Upload file" as primary alternative
- Never attempt to bypass restrictions

### 4.6 Video Transcoding

#### 4.6.1 Pipeline
```
Upload → Validation → Queue → FFmpeg Worker → HLS Output → Storage → CDN
                                    ↓
                              Health Check
                              Watchdog
```

#### 4.6.2 FFmpeg Settings
```bash
# Adaptive bitrate HLS
ffmpeg -i input.mkv \
  -filter_complex "[0:v]split=3[v1][v2][v3];[v1]scale=1280:720[v1out];[v2]scale=854:480[v2out];[v3]scale=640:360[v3out]" \
  -map "[v1out]" -c:v:0 libx264 -b:v:0 3000k \
  -map "[v2out]" -c:v:1 libx264 -b:v:1 1500k \
  -map "[v3out]" -c:v:2 libx264 -b:v:2 800k \
  -map a:0 -c:a aac -b:a 128k \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:0 v:2,a:0" \
  output/stream_%v.m3u8
```

#### 4.6.3 Transcoding States
```
PENDING → PROCESSING (0-100%) → READY | FAILED
                ↓
          TIMEOUT (watchdog)
                ↓
            FAILED
```

#### 4.6.4 FFmpeg Health & Watchdog (Production Required)

> ⚠️ **FFmpeg jobs can hang or consume excessive resources. Watchdog is mandatory.**

**Job Configuration**:
```typescript
interface TranscodingJobConfig {
  // Resource limits
  maxCpuPercent: 80;           // Limit CPU usage
  maxMemoryMB: 4096;           // Kill if exceeds 4GB RAM
  maxDurationMinutes: 60;      // Timeout for 3-hour video

  // Watchdog settings
  progressTimeoutMs: 120000;   // Kill if no progress for 2 minutes
  healthCheckIntervalMs: 10000; // Check every 10 seconds

  // Retry policy
  maxRetries: 3;
  retryBackoffMs: [5000, 30000, 120000];  // Exponential backoff
}
```

**Watchdog Implementation**:
```typescript
class FFmpegWatchdog {
  private lastProgress: number = 0;
  private lastProgressTime: number = Date.now();

  onProgress(progress: number) {
    if (progress > this.lastProgress) {
      this.lastProgress = progress;
      this.lastProgressTime = Date.now();
    }
  }

  checkHealth(): 'healthy' | 'stalled' | 'timeout' {
    const elapsed = Date.now() - this.lastProgressTime;
    if (elapsed > PROGRESS_TIMEOUT_MS) return 'timeout';
    if (elapsed > STALL_WARNING_MS) return 'stalled';
    return 'healthy';
  }

  async killStuckProcess(pid: number) {
    // SIGTERM first, then SIGKILL after 10s
    process.kill(pid, 'SIGTERM');
    await sleep(10000);
    if (isProcessRunning(pid)) {
      process.kill(pid, 'SIGKILL');
    }
  }
}
```

**HLS Segment Cleanup**:
```typescript
interface CleanupPolicy {
  // Automatic cleanup
  deleteAfterRoomExpiry: true;
  deleteOrphanedSegmentsAfterHours: 24;
  maxStoragePerUserGB: 20;

  // Cleanup job (runs hourly)
  cleanupSchedule: '0 * * * *';  // Every hour
}

async function cleanupOrphanedSegments() {
  // Find HLS segments without associated video record
  // Delete segments older than 24 hours with no room reference
  // Log cleanup metrics for observability
}
```

#### 4.6.5 CDN / Edge Delivery (Production Required)

> **HLS cannot be served directly from MinIO in production.**

**Delivery Architecture**:
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│     CDN      │────▶│    MinIO     │
│              │     │  (Cached)    │     │   (Origin)   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     Cache Headers:
                     - Segments: max-age=31536000
                     - Playlist: max-age=5, stale-while-revalidate
```

**Options for HLS Delivery**:

1. **CDN** (Recommended for production):
   - CloudFlare, BunnyCDN, AWS CloudFront
   - Global edge locations
   - Automatic cache invalidation

2. **Nginx Cache** (Self-hosted alternative):
```nginx
# nginx.conf for HLS caching
location /hls/ {
    proxy_pass http://minio:9000/hls/;
    proxy_cache hls_cache;

    # Cache .ts segments aggressively (immutable)
    location ~ \.ts$ {
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Cache playlists briefly
    location ~ \.m3u8$ {
        proxy_cache_valid 200 5s;
        add_header Cache-Control "public, max-age=5, stale-while-revalidate=10";
    }

    # Support range requests
    proxy_set_header Range $http_range;
    proxy_set_header If-Range $http_if_range;
}
```

3. **Cache Headers** (Mandatory regardless of CDN):
```typescript
// All HLS responses must include proper cache headers
const hlsCacheHeaders = {
  '.ts': 'public, max-age=31536000, immutable',  // Segments never change
  '.m3u8': 'public, max-age=5, stale-while-revalidate=10',  // Playlists refresh
};
```

---

## 5. API Design

### 5.1 REST Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET | `/api/auth/me` | Get current user |

#### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/:code` | Get room info |
| POST | `/api/rooms/:code/join` | Join room |
| DELETE | `/api/rooms/:code` | Delete room (owner) |

#### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/upload` | Upload video file |
| GET | `/api/videos/:id/status` | Get transcoding status |
| GET | `/api/videos/:id/manifest` | Get HLS manifest URL |

#### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | List friends |
| POST | `/api/friends/request` | Send friend request |
| POST | `/api/friends/accept` | Accept request |
| DELETE | `/api/friends/:id` | Remove friend |

### 5.2 WebSocket Events

#### Namespace: `/sync`
```typescript
// Client → Server
'room:join': { roomCode: string; password?: string }
'sync:play': { atServerTime: number }
'sync:pause': { atServerTime: number }
'sync:seek': { targetMediaTime: number; atServerTime: number }
'sync:rate': { rate: number; atServerTime: number }

// Server → Client
'room:state': PlaybackState
'sync:command': SyncCommand
'room:participants': Participant[]
'room:error': { code: string; message: string }
```

#### Namespace: `/chat`
```typescript
// Client → Server
'chat:message': { content: string }

// Server → Client
'chat:message': ChatMessage
'chat:history': ChatMessage[]
```

#### Namespace: `/voice`
```typescript
// Client → Server
'voice:join': {}
'voice:leave': {}
'voice:signal': { targetId: string; signal: RTCSignal }

// Server → Client
'voice:peers': string[]
'voice:signal': { fromId: string; signal: RTCSignal }
'voice:peer:joined': { peerId: string }
'voice:peer:left': { peerId: string }
```

---

## 6. Database Schema

### 6.1 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  ownedRooms        Room[]
  roomParticipations RoomParticipant[]
  sentFriendRequests    Friendship[] @relation("FriendshipRequester")
  receivedFriendRequests Friendship[] @relation("FriendshipAddressee")
  messages          ChatMessage[]
  uploadedVideos    Video[]
}

model Room {
  id              String   @id @default(cuid())
  code            String   @unique // 8-char invite code
  name            String
  ownerId         String
  maxParticipants Int      @default(5)
  passwordHash    String?
  playbackControl String   @default("owner_only")
  createdAt       DateTime @default(now())
  expiresAt       DateTime

  owner        User              @relation(fields: [ownerId], references: [id])
  participants RoomParticipant[]
  video        Video?            @relation(fields: [videoId], references: [id])
  videoId      String?
  messages     ChatMessage[]
}

model RoomParticipant {
  id        String   @id @default(cuid())
  roomId    String
  userId    String?  // null for guests
  guestName String?
  role      String   @default("participant") // owner, participant, guest
  joinedAt  DateTime @default(now())

  room Room  @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id])

  @@unique([roomId, userId])
}

model Video {
  id           String   @id @default(cuid())
  uploaderId   String
  filename     String
  originalSize Int
  duration     Int?     // seconds
  status       String   @default("pending") // pending, processing, ready, failed
  progress     Int      @default(0) // 0-100
  manifestUrl  String?
  storageKey   String
  createdAt    DateTime @default(now())
  expiresAt    DateTime

  uploader User   @relation(fields: [uploaderId], references: [id])
  rooms    Room[]
}

model ChatMessage {
  id        String   @id @default(cuid())
  roomId    String
  userId    String?
  type      String   @default("user") // user, system
  content   String
  createdAt DateTime @default(now())

  room Room  @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id])
}

model Friendship {
  id          String   @id @default(cuid())
  requesterId String
  addresseeId String
  status      String   @default("pending") // pending, accepted, blocked
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requester User @relation("FriendshipRequester", fields: [requesterId], references: [id])
  addressee User @relation("FriendshipAddressee", fields: [addresseeId], references: [id])

  @@unique([requesterId, addresseeId])
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## 7. Security Considerations

### 7.1 Authentication & Authorization
- JWT access tokens (15min expiry) + refresh tokens (7 days)
- Passwords hashed with bcrypt (cost factor 12)
- CSRF protection for cookie-based auth
- Rate limiting on auth endpoints

### 7.2 Room Security
- Invite codes: 8-character cryptographically random strings
- Optional password protection (bcrypt hashed)
- Owner verification for destructive actions
- Automatic room expiration

### 7.3 Input Validation
- All inputs validated with Zod schemas
- File upload validation (type, size, duration)
- WebSocket message validation

### 7.4 Transport Security
- TLS 1.3 for all connections
- Secure WebSocket (wss://)
- HTTPS-only cookies

### 7.5 Content Security
- No DRM bypass or stream extraction
- Content-Security-Policy headers
- X-Frame-Options for embeds

### 7.6 Rate Limiting
| Action | Limit |
|--------|-------|
| Room creation | 5/hour per user |
| Chat messages | 30/minute per user |
| File upload | 3/hour per user |
| API requests | 100/minute per IP |

---

## 8. Observability (Production Required)

> **Without observability, debugging production issues is impossible.**
> This section is mandatory for a mature production system.

### 8.1 Structured Logging

**Logger Configuration** (Pino):
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'syncwatch-backend',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  // Redact sensitive fields
  redact: ['password', 'token', 'credential', 'authorization'],
});

// Request logging with correlation ID
app.addHook('onRequest', (request, reply, done) => {
  request.log = logger.child({
    requestId: request.id,
    userId: request.user?.id,
    roomId: request.params?.roomId,
  });
  done();
});
```

**Log Levels**:
```
ERROR - Operation failed, requires attention
WARN  - Degraded behavior, but recoverable
INFO  - Business events (room created, user joined)
DEBUG - Technical details (sync commands, ICE states)
TRACE - Verbose debugging (every message, every frame)
```

### 8.2 Metrics (Prometheus)

**Core Application Metrics**:
```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

// Sync quality metrics
const playbackDriftHistogram = new Histogram({
  name: 'syncwatch_playback_drift_ms',
  help: 'Playback drift between participants in milliseconds',
  labelNames: ['roomId'],
  buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000],
});

const syncLatencyHistogram = new Histogram({
  name: 'syncwatch_sync_command_latency_ms',
  help: 'Time from command issue to all clients acknowledgment',
  labelNames: ['command_type'],
  buckets: [50, 100, 200, 300, 500, 1000],
});

// WebRTC metrics
const iceFailureCounter = new Counter({
  name: 'syncwatch_ice_failures_total',
  help: 'Total ICE connection failures',
  labelNames: ['failure_reason', 'ice_type'],
});

const turnUsageGauge = new Gauge({
  name: 'syncwatch_turn_usage_percent',
  help: 'Percentage of connections using TURN relay',
});

// FFmpeg metrics
const transcodingDurationHistogram = new Histogram({
  name: 'syncwatch_transcoding_duration_seconds',
  help: 'Video transcoding job duration',
  labelNames: ['video_duration_bucket', 'resolution'],
  buckets: [60, 300, 600, 1800, 3600, 7200],
});

const transcodingFailureCounter = new Counter({
  name: 'syncwatch_transcoding_failures_total',
  help: 'Total transcoding job failures',
  labelNames: ['failure_reason'],  // timeout, oom, format_error
});

// Room metrics
const activeRoomsGauge = new Gauge({
  name: 'syncwatch_active_rooms',
  help: 'Number of active rooms',
});

const participantsPerRoomHistogram = new Histogram({
  name: 'syncwatch_participants_per_room',
  help: 'Distribution of participants per room',
  buckets: [1, 2, 3, 4, 5],
});
```

**Target Quality Metrics**:
| Metric | Target p95 | Alert Threshold |
|--------|------------|-----------------|
| Playback drift | < 250ms | > 500ms |
| Sync command latency | < 300ms | > 1000ms |
| ICE connection time | < 3s | > 10s |
| Transcoding time (1hr video) | < 20min | > 45min |
| TURN usage | < 30% | > 50% |

### 8.3 Distributed Tracing (OpenTelemetry)

**Setup**:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Custom Spans for Sync Operations**:
```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('syncwatch-sync');

async function handleSyncCommand(command: SyncCommand, roomId: string) {
  const span = tracer.startSpan('sync.command', {
    attributes: {
      'sync.command_type': command.type,
      'sync.room_id': roomId,
      'sync.sequence_number': command.sequenceNumber,
    },
  });

  try {
    await broadcastToRoom(roomId, command);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### 8.4 Health Checks

**Endpoints**:
```typescript
// /health/live - Is the process running?
app.get('/health/live', async () => ({ status: 'ok' }));

// /health/ready - Can we accept traffic?
app.get('/health/ready', async () => {
  const checks = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMinio(),
  ]);

  const allHealthy = checks.every(c => c.healthy);
  return {
    status: allHealthy ? 'ok' : 'degraded',
    checks: {
      postgres: checks[0],
      redis: checks[1],
      minio: checks[2],
    },
  };
});

// /metrics - Prometheus scrape endpoint
app.get('/metrics', async () => {
  return promClient.register.metrics();
});
```

### 8.5 Alerting Rules (Example Prometheus)

```yaml
# alerts.yml
groups:
  - name: syncwatch
    rules:
      - alert: HighPlaybackDrift
        expr: histogram_quantile(0.95, syncwatch_playback_drift_ms_bucket) > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High playback drift detected"
          description: "p95 playback drift is {{ $value }}ms"

      - alert: TranscodingBacklog
        expr: syncwatch_transcoding_queue_length > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Transcoding backlog growing"

      - alert: HighTURNUsage
        expr: syncwatch_turn_usage_percent > 50
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "High TURN relay usage"
          description: "{{ $value }}% of connections using TURN"
```

---

## 9. Deployment Architecture

### 9.1 Development Environment
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    volumes: ["./frontend:/app"]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on: [db, redis]

  transcoder:
    build: ./transcoder
    volumes: ["./storage:/storage"]
    depends_on: [redis, minio]

  db:
    image: postgres:15-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
```

### 9.2 Production Considerations
- Horizontal scaling with Redis pub/sub
- CDN for video segment delivery
- Database read replicas
- Container orchestration (K8s or Docker Swarm)
- TURN server for WebRTC NAT traversal

---

## 10. Work Plan

### Phase 1: Foundation (Infrastructure & Auth)
1. Project setup (monorepo structure, TypeScript config)
2. Docker environment setup
3. Database schema & Prisma setup
4. Authentication system (register, login, JWT)
5. Basic API structure

### Phase 2: Core Room Functionality
6. Room creation & management
7. Invite link system
8. Room state management (Redis)
9. WebSocket connection handling

### Phase 3: Video Playback
10. YouTube embed integration
11. Video upload endpoint
12. Transcoding worker (FFmpeg)
13. HLS playback (HLS.js integration)

### Phase 4: Synchronization
14. Sync protocol implementation (server)
15. Sync client logic
16. Clock synchronization
17. Drift correction algorithm

### Phase 5: Communication
18. Text chat (WebSocket)
19. Voice chat (WebRTC signaling)
20. P2P audio mesh
21. PTT & VAD modes

### Phase 6: User Features
22. User profiles
23. Friend system
24. Room history

### Phase 7: UI/UX
25. Liquid glass design system
26. Responsive layouts
27. Animations & transitions
28. Sound effects

### Phase 8: Polish & Launch
29. Error handling & recovery
30. Performance optimization
31. Testing & QA
32. Documentation
33. Deployment pipeline

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| HLS | HTTP Live Streaming - Apple's adaptive bitrate streaming protocol |
| PTT | Push-to-Talk - voice activation by holding a key |
| VAD | Voice Activity Detection - automatic voice activation |
| SFU | Selective Forwarding Unit - centralized WebRTC media server |
| Anchor | Reference point for calculating playback position |

## Appendix B: External Resources

- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [HLS.js Documentation](https://github.com/video-dev/hls.js)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Prisma Documentation](https://www.prisma.io/docs)
