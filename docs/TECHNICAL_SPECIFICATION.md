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
   - [7.7 Security Hardening](#77-security-hardening-production-required)
   - [7.8 Audit Logging](#78-audit-logging-production-required)
8. [Observability (Production Required)](#8-observability-production-required)
   - [8.6 Enhanced Health Checks](#86-enhanced-health-checks)
   - [8.7 Resource Limits](#87-resource-limits)
9. [Deployment Architecture](#9-deployment-architecture)
   - [9.3 Environment Configuration](#93-environment-configuration)
   - [9.4 Secrets Management](#94-secrets-management)
   - [9.5 Graceful Shutdown](#95-graceful-shutdown)
10. [CI/CD Pipeline (Production Required)](#10-cicd-pipeline-production-required)
   - [10.1 GitHub Actions Workflow](#101-github-actions-workflow)
   - [10.2 Versioning & Release Strategy](#102-versioning--release-strategy)
11. [Infrastructure as Code](#11-infrastructure-as-code)
12. [Reliability & Disaster Recovery](#12-reliability--disaster-recovery)
   - [12.1 Backup & Restore](#121-backup--restore)
   - [12.2 Disaster Recovery Plan](#122-disaster-recovery-plan)
13. [Operations Documentation](#13-operations-documentation)
14. [Work Plan](#14-work-plan)

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

### 7.7 Security Hardening (Production Required)

> **For production maturity, security must go beyond basic auth and validation.**

#### 7.7.1 CSP & CORS Configuration

```typescript
// Content Security Policy (strict)
const cspPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://www.youtube.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'media-src': ["'self'", 'blob:', 'https://storage.syncwatch.example'],
  'frame-src': ['https://www.youtube.com'],
  'connect-src': ["'self'", 'wss:', 'https:'],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// CORS (strict origin validation)
const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

#### 7.7.2 Upload Security

```typescript
interface UploadSecurityConfig {
  // File validation
  allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
  maxSizeBytes: 8 * 1024 * 1024 * 1024;  // 8 GB

  // Signature verification (magic bytes)
  magicBytes: {
    'video/mp4': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],
    'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
    'video/quicktime': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],
  };

  // Bandwidth throttling per user
  uploadBandwidthLimitMbps: 50;  // 50 Mbps per user

  // Scan for embedded content (optional)
  scanForMalware: boolean;
}

async function validateUpload(file: Buffer, mimeType: string): Promise<ValidationResult> {
  // 1. Check declared MIME type
  if (!allowedMimeTypes.includes(mimeType)) {
    return { valid: false, reason: 'unsupported_format' };
  }

  // 2. Verify magic bytes match declared type
  const expectedMagic = magicBytes[mimeType];
  if (!verifyMagicBytes(file, expectedMagic)) {
    return { valid: false, reason: 'mime_mismatch' };
  }

  // 3. Check file size
  if (file.length > maxSizeBytes) {
    return { valid: false, reason: 'too_large' };
  }

  return { valid: true };
}
```

#### 7.7.3 Room Brute-Force Protection

```typescript
interface RoomSecurityConfig {
  // Room code protection
  codeAttemptLimit: 5;          // Max wrong codes per IP per hour
  codeBlockDurationMinutes: 60; // Block duration after limit reached

  // Password protection
  passwordAttemptLimit: 3;      // Max wrong passwords per IP per room
  passwordBlockDurationMinutes: 30;

  // Rate limiting per IP
  roomJoinLimitPerMinute: 10;   // Max room join attempts per minute
}

// Implementation with Redis
async function checkRoomAccessAttempt(ip: string, roomCode: string): Promise<boolean> {
  const key = `room:access:${ip}:${roomCode}`;
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, 3600);  // 1 hour TTL
  }

  if (attempts > ROOM_ACCESS_LIMIT) {
    logger.warn({ ip, roomCode, attempts }, 'Room access limit exceeded');
    return false;
  }

  return true;
}
```

### 7.8 Audit Logging (Production Required)

> **For incident investigation and compliance, all security-relevant actions must be logged.**

#### 7.8.1 Audit Events

```typescript
type AuditEventType =
  // Room events
  | 'room.created'
  | 'room.deleted'
  | 'room.settings_changed'

  // Participant events
  | 'participant.joined'
  | 'participant.left'
  | 'participant.kicked'
  | 'participant.banned'

  // Permission events
  | 'permission.granted'
  | 'permission.revoked'
  | 'ownership.transferred'

  // Playback events
  | 'playback.started'
  | 'playback.paused'
  | 'playback.video_changed'

  // Auth events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.password_changed'

  // Admin events
  | 'admin.user_banned'
  | 'admin.content_removed';

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  actorId: string;           // User who performed the action
  actorIp: string;
  targetType: 'room' | 'user' | 'video';
  targetId: string;
  metadata: Record<string, unknown>;
  success: boolean;
}
```

#### 7.8.2 Audit Log Storage

```typescript
// Prisma schema addition
model AuditLog {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  eventType   String
  actorId     String?
  actorIp     String
  targetType  String
  targetId    String
  metadata    Json
  success     Boolean  @default(true)

  @@index([timestamp])
  @@index([actorId])
  @@index([targetId])
  @@index([eventType])
}

// Audit logger service
class AuditLogger {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    // 1. Write to database for queryability
    await prisma.auditLog.create({
      data: {
        ...event,
        metadata: event.metadata,
      },
    });

    // 2. Also emit structured log for log aggregation
    logger.info({
      audit: true,
      ...event,
    }, `Audit: ${event.eventType}`);
  }
}

// Usage example
await auditLogger.log({
  eventType: 'participant.kicked',
  actorId: ownerId,
  actorIp: request.ip,
  targetType: 'user',
  targetId: kickedUserId,
  metadata: {
    roomId,
    reason: 'inappropriate_behavior',
  },
  success: true,
});
```

#### 7.8.3 Audit Log Retention

```typescript
interface AuditRetentionPolicy {
  // Retention periods by event type
  security: 365;    // Auth events, bans - 1 year
  moderation: 90;   // Kicks, content removal - 90 days
  activity: 30;     // Joins, leaves, playback - 30 days

  // Cleanup job
  cleanupSchedule: '0 2 * * *';  // Daily at 2 AM
}

async function cleanupOldAuditLogs(): Promise<void> {
  const cutoffs = {
    security: subDays(new Date(), RETENTION.security),
    moderation: subDays(new Date(), RETENTION.moderation),
    activity: subDays(new Date(), RETENTION.activity),
  };

  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { eventType: { in: SECURITY_EVENTS }, timestamp: { lt: cutoffs.security } },
        { eventType: { in: MODERATION_EVENTS }, timestamp: { lt: cutoffs.moderation } },
        { eventType: { in: ACTIVITY_EVENTS }, timestamp: { lt: cutoffs.activity } },
      ],
    },
  });
}
```

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

### 8.6 Enhanced Health Checks

> **Each service must expose comprehensive health endpoints for orchestration and monitoring.**

#### 8.6.1 Health Check Endpoints

```typescript
// All services must implement these endpoints

// GET /health/live - Kubernetes liveness probe
// Returns 200 if process is running
// Should be lightweight and fast
app.get('/health/live', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// GET /health/ready - Kubernetes readiness probe
// Returns 200 only if service can accept traffic
app.get('/health/ready', async () => {
  const checks = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMinio(),
    checkTurnServer(),
  ]);

  const allHealthy = checks.every(c => c.healthy);
  const status = allHealthy ? 'ok' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      postgres: checks[0],
      redis: checks[1],
      minio: checks[2],
      turn: checks[3],
    },
  };
});

// Health check implementations
async function checkPostgres(): Promise<HealthCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, latencyMs: /* measured */ };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkTurnServer(): Promise<HealthCheckResult> {
  try {
    // Verify TURN server is reachable
    const response = await fetch(`http://${TURN_HOST}:${TURN_REST_PORT}/status`);
    return { healthy: response.ok, latencyMs: /* measured */ };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

#### 8.6.2 FFmpeg Worker Health

```typescript
// Transcoder worker health check
interface TranscoderHealth {
  healthy: boolean;
  activeJobs: number;
  queueDepth: number;
  ffmpegAvailable: boolean;
  gpuAvailable?: boolean;
  lastJobCompletedAt?: Date;
  lastJobFailedAt?: Date;
  cpuUsagePercent: number;
  memoryUsageMB: number;
}

app.get('/health/transcoder', async (): Promise<TranscoderHealth> => {
  const ffmpegCheck = await exec('ffmpeg -version').catch(() => null);
  const activeJobs = await bullQueue.getActiveCount();
  const waitingJobs = await bullQueue.getWaitingCount();
  const memUsage = process.memoryUsage();

  return {
    healthy: ffmpegCheck !== null && activeJobs < MAX_CONCURRENT_JOBS,
    activeJobs,
    queueDepth: waitingJobs,
    ffmpegAvailable: ffmpegCheck !== null,
    cpuUsagePercent: await getCpuUsage(),
    memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
  };
});
```

### 8.7 Resource Limits

> **Production containers must have explicit resource limits to prevent runaway processes.**

#### 8.7.1 Docker Compose Resource Limits

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: syncwatch-backend:${VERSION}
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  transcoder:
    image: syncwatch-transcoder:${VERSION}
    deploy:
      resources:
        limits:
          cpus: '4'          # FFmpeg is CPU intensive
          memory: 8G         # Video processing needs RAM
        reservations:
          cpus: '1'
          memory: 2G

  frontend:
    image: syncwatch-frontend:${VERSION}
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    command: redis-server --maxmemory 800mb --maxmemory-policy allkeys-lru

  postgres:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G
    command: >
      postgres
        -c shared_buffers=1GB
        -c effective_cache_size=3GB
        -c maintenance_work_mem=256MB
        -c max_connections=200
```

#### 8.7.2 FFmpeg Process Limits

```typescript
// FFmpeg spawn with resource limits
import { spawn } from 'child_process';

interface FFmpegResourceLimits {
  maxCpuPercent: number;     // Use cpulimit or nice
  maxMemoryMB: number;       // Monitor and kill if exceeded
  timeoutMinutes: number;    // Max job duration
  niceLevel: number;         // Process priority (19 = lowest)
}

function spawnFFmpegWithLimits(
  args: string[],
  limits: FFmpegResourceLimits
): ChildProcess {
  // Use nice to lower priority
  const command = limits.niceLevel
    ? ['nice', '-n', String(limits.niceLevel), 'ffmpeg', ...args]
    : ['ffmpeg', ...args];

  const proc = spawn(command[0], command.slice(1), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Set up memory monitoring
  const memoryWatcher = setInterval(async () => {
    try {
      const usage = await getProcessMemoryMB(proc.pid);
      if (usage > limits.maxMemoryMB) {
        logger.warn({ pid: proc.pid, usage }, 'FFmpeg exceeded memory limit');
        proc.kill('SIGTERM');
      }
    } catch {
      // Process may have exited
    }
  }, 5000);

  // Set up timeout
  const timeout = setTimeout(() => {
    logger.warn({ pid: proc.pid }, 'FFmpeg exceeded time limit');
    proc.kill('SIGTERM');
  }, limits.timeoutMinutes * 60 * 1000);

  proc.on('exit', () => {
    clearInterval(memoryWatcher);
    clearTimeout(timeout);
  });

  return proc;
}
```

#### 8.7.3 Upload Throttling

```typescript
// Per-user upload bandwidth limiting
import { RateLimiter } from 'limiter';

const uploadLimiters = new Map<string, RateLimiter>();

function getUploadLimiter(userId: string): RateLimiter {
  if (!uploadLimiters.has(userId)) {
    // 50 Mbps = 6.25 MB/s = 6250 KB/s
    // Allow bursts of 10 MB
    uploadLimiters.set(userId, new RateLimiter({
      tokensPerInterval: 6250,  // KB per second
      interval: 1000,
    }));
  }
  return uploadLimiters.get(userId)!;
}

// Usage in upload handler
async function handleChunkUpload(
  userId: string,
  chunk: Buffer
): Promise<void> {
  const limiter = getUploadLimiter(userId);
  const chunkSizeKB = chunk.length / 1024;

  // Wait for tokens (blocking if rate exceeded)
  await limiter.removeTokens(chunkSizeKB);

  // Process chunk
  await saveChunk(chunk);
}
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

### 9.3 Environment Configuration

> **Production requires clear separation of environments with distinct configurations.**

#### 9.3.1 Environment Matrix

| Environment | Purpose | Auto-Deploy | Persistence |
|-------------|---------|-------------|-------------|
| `development` | Local dev & feature work | No | Ephemeral |
| `staging` | Integration testing, QA | Yes (from `develop`) | Short-lived |
| `production` | Live users | Manual (from `main`) | Persistent |

#### 9.3.2 Environment-Specific Configuration

```typescript
// config/environments.ts
interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production';

  // API
  apiUrl: string;
  wsUrl: string;

  // Database
  databaseUrl: string;
  databasePoolMin: number;
  databasePoolMax: number;

  // Redis
  redisUrl: string;

  // Storage
  minioEndpoint: string;
  minioBucket: string;

  // TURN
  turnServers: TurnServer[];
  turnSecret: string;

  // Features
  enableDebugLogs: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    apiUrl: 'http://localhost:4000',
    wsUrl: 'ws://localhost:4000',
    databaseUrl: process.env.DATABASE_URL_DEV,
    databasePoolMin: 1,
    databasePoolMax: 5,
    enableDebugLogs: true,
    enableMetrics: false,
    enableTracing: false,
    // ... other configs
  },
  staging: {
    name: 'staging',
    apiUrl: 'https://staging-api.syncwatch.example',
    wsUrl: 'wss://staging-api.syncwatch.example',
    databaseUrl: process.env.DATABASE_URL_STAGING,
    databasePoolMin: 2,
    databasePoolMax: 10,
    enableDebugLogs: true,
    enableMetrics: true,
    enableTracing: true,
    // ... other configs
  },
  production: {
    name: 'production',
    apiUrl: 'https://api.syncwatch.example',
    wsUrl: 'wss://api.syncwatch.example',
    databaseUrl: process.env.DATABASE_URL_PRODUCTION,
    databasePoolMin: 5,
    databasePoolMax: 50,
    enableDebugLogs: false,
    enableMetrics: true,
    enableTracing: true,
    // ... other configs
  },
};
```

#### 9.3.3 Environment Isolation Requirements

| Resource | Dev | Staging | Production |
|----------|-----|---------|------------|
| PostgreSQL DB | `syncwatch_dev` | `syncwatch_staging` | `syncwatch_prod` |
| Redis DB | 0-4 (shared) | Separate instance | Separate cluster |
| MinIO Bucket | `syncwatch-dev` | `syncwatch-staging` | `syncwatch-prod` |
| TURN Credentials | Shared test | Environment-specific | Rotated, environment-specific |
| Domain | localhost | staging.syncwatch.example | syncwatch.example |

### 9.4 Secrets Management

> **Production secrets must NEVER be stored in the repository or Docker images.**

#### 9.4.1 Secret Categories

| Category | Examples | Rotation Frequency |
|----------|----------|-------------------|
| Database | `DATABASE_URL`, `POSTGRES_PASSWORD` | 90 days |
| Auth | `JWT_SECRET`, `SESSION_SECRET` | 30 days |
| Storage | `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | 90 days |
| TURN | `TURN_SECRET` | 7 days |
| External | `GITHUB_TOKEN`, `SENTRY_DSN` | As needed |

#### 9.4.2 Secrets Management Options

**Option 1: Docker Secrets (Docker Swarm)**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: syncwatch-backend:${VERSION}
    secrets:
      - db_password
      - jwt_secret
      - turn_secret
    environment:
      DATABASE_URL_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  turn_secret:
    external: true
```

**Option 2: HashiCorp Vault**
```typescript
// Vault integration
import Vault from 'node-vault';

const vault = Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function getSecret(path: string): Promise<string> {
  const result = await vault.read(`secret/data/${path}`);
  return result.data.data.value;
}

// Usage
const jwtSecret = await getSecret('syncwatch/jwt-secret');
const dbPassword = await getSecret('syncwatch/database/password');
```

**Option 3: Kubernetes Secrets**
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: syncwatch-secrets
  namespace: syncwatch
type: Opaque
stringData:
  DATABASE_URL: postgresql://...  # Injected by CI/CD
  JWT_SECRET: ...
  TURN_SECRET: ...
---
apiVersion: v1
kind: Deployment
spec:
  containers:
    - name: backend
      envFrom:
        - secretRef:
            name: syncwatch-secrets
```

#### 9.4.3 Secret Injection (CI/CD)

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
          TURN_SECRET: ${{ secrets.PROD_TURN_SECRET }}
        run: |
          # Secrets injected via environment variables
          # Never logged, never stored in artifacts
```

### 9.5 Graceful Shutdown

> **Services must handle shutdown signals gracefully to prevent data loss and dropped connections.**

#### 9.5.1 Shutdown Signal Handling

```typescript
// graceful-shutdown.ts
import { Server } from 'http';
import { Server as SocketServer } from 'socket.io';

class GracefulShutdown {
  private isShuttingDown = false;
  private shutdownTimeout = 30000;  // 30 seconds max

  constructor(
    private httpServer: Server,
    private io: SocketServer,
    private prisma: PrismaClient,
    private redis: RedisClient,
    private bullQueues: Queue[],
  ) {
    // Handle termination signals
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated');

    // Set hard timeout
    const forceExitTimer = setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // 1. Stop accepting new connections
      this.httpServer.close();
      logger.info('HTTP server closed');

      // 2. Notify all WebSocket clients
      this.io.emit('server:shutdown', {
        message: 'Server is shutting down for maintenance',
        reconnectIn: 30000,
      });

      // 3. Wait for active WebSocket connections to close gracefully
      await this.closeWebSocketConnections();

      // 4. Pause job queues (finish active, don't start new)
      for (const queue of this.bullQueues) {
        await queue.pause();
      }
      logger.info('Job queues paused');

      // 5. Wait for active jobs to complete (with timeout)
      await this.waitForActiveJobs();

      // 6. Close database connections
      await this.prisma.$disconnect();
      logger.info('Database disconnected');

      // 7. Close Redis connections
      await this.redis.quit();
      logger.info('Redis disconnected');

      clearTimeout(forceExitTimer);
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  }

  private async closeWebSocketConnections(): Promise<void> {
    const sockets = await this.io.fetchSockets();

    // Save room states before disconnecting
    for (const socket of sockets) {
      const roomId = socket.data.roomId;
      if (roomId) {
        await this.saveRoomState(roomId);
      }
    }

    // Disconnect all sockets
    this.io.disconnectSockets(true);
    logger.info({ count: sockets.length }, 'WebSocket connections closed');
  }

  private async waitForActiveJobs(): Promise<void> {
    const maxWaitMs = 15000;
    const startTime = Date.now();

    for (const queue of this.bullQueues) {
      while (Date.now() - startTime < maxWaitMs) {
        const activeCount = await queue.getActiveCount();
        if (activeCount === 0) break;

        logger.info({ queue: queue.name, activeCount }, 'Waiting for jobs');
        await sleep(1000);
      }
    }
  }

  private async saveRoomState(roomId: string): Promise<void> {
    // Persist room state to Redis/DB for recovery
    const state = await getRoomState(roomId);
    await redis.set(`room:${roomId}:shutdown_state`, JSON.stringify(state));
  }
}
```

#### 9.5.2 FFmpeg Job Graceful Termination

```typescript
// FFmpeg graceful shutdown
class FFmpegJobHandler {
  private activeProcesses = new Map<string, ChildProcess>();

  async shutdown(): Promise<void> {
    const processes = Array.from(this.activeProcesses.entries());

    for (const [jobId, proc] of processes) {
      logger.info({ jobId }, 'Sending SIGTERM to FFmpeg process');

      // Send SIGTERM first
      proc.kill('SIGTERM');

      // Wait up to 10 seconds for graceful exit
      await Promise.race([
        new Promise<void>((resolve) => proc.on('exit', resolve)),
        sleep(10000),
      ]);

      // Force kill if still running
      if (!proc.killed) {
        logger.warn({ jobId }, 'Force killing FFmpeg process');
        proc.kill('SIGKILL');
      }

      // Mark job for retry on restart
      await markJobForRetry(jobId);
    }
  }
}
```

---

## 10. CI/CD Pipeline (Production Required)

> **Without CI/CD, production deployment is error-prone and not scalable for team development.**

### 10.1 GitHub Actions Workflow

#### 10.1.1 CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint:frontend
      - run: npm run lint:backend

  typecheck:
    name: TypeScript Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: coverage/lcov.info

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: syncwatch_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run db:generate
      - run: npm run db:migrate:test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/syncwatch_test
          REDIS_URL: redis://localhost:6379

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build-docker:
    name: Build Docker Images
    needs: [lint, typecheck, test-unit, test-integration]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./packages/backend
          push: ${{ github.event_name != 'pull_request' }}
          tags: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: docker/build-push-action@v5
        with:
          context: ./packages/frontend
          push: ${{ github.event_name != 'pull_request' }}
          tags: ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
```

#### 10.1.2 CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop' || inputs.environment == 'staging'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          # Deploy using Docker Compose or K8s
          ssh staging "cd /app && docker-compose pull && docker-compose up -d"
        env:
          SSH_KEY: ${{ secrets.STAGING_SSH_KEY }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    if: inputs.environment == 'production'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Run database migrations
        run: npm run db:migrate:deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      - name: Deploy to production
        run: |
          # Rolling deployment
          kubectl set image deployment/syncwatch-backend backend=ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          kubectl rollout status deployment/syncwatch-backend
```

### 10.2 Versioning & Release Strategy

#### 10.2.1 Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR - Breaking changes (API incompatibility, DB migrations with data loss)
MINOR - New features (backward compatible)
PATCH - Bug fixes (backward compatible)

Examples:
1.0.0 - Initial release
1.1.0 - Add friend system
1.1.1 - Fix friend request bug
2.0.0 - Breaking change to sync protocol
```

#### 10.2.2 Conventional Commits

```bash
# Commit message format
<type>(<scope>): <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, missing semicolons
refactor: Code change without feature/fix
perf:     Performance improvement
test:     Adding tests
chore:    Build process, auxiliary tools

# Examples
feat(rooms): add password protection for rooms
fix(sync): correct drift calculation for slow connections
docs(api): update WebSocket event documentation
refactor(transcoder): extract FFmpeg process management
```

#### 10.2.3 Release Process

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate changelog
        id: changelog
        uses: conventional-changelog/conventional-changelog-action@v3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: ${{ contains(github.ref, '-rc') }}

      - name: Build and push release images
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}/backend:latest
```

#### 10.2.4 Changelog

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Voice chat with PTT and VAD modes
- Friend system

### Changed
- Improved sync algorithm for better drift correction

### Fixed
- Room join race condition

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Room creation with invite links
- Video upload with HLS transcoding
- YouTube embed support
- Real-time synchronization
- Text chat
```

---

## 11. Infrastructure as Code

> **Production infrastructure must be declaratively defined and version-controlled.**

### 11.1 Terraform Configuration

```hcl
# infrastructure/main.tf

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  backend "s3" {
    bucket = "syncwatch-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

# Variables
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "region" {
  description = "Deployment region"
  type        = string
  default     = "nyc3"
}

# VPC
resource "digitalocean_vpc" "main" {
  name     = "syncwatch-${var.environment}"
  region   = var.region
  ip_range = "10.10.0.0/16"
}

# Database
resource "digitalocean_database_cluster" "postgres" {
  name       = "syncwatch-db-${var.environment}"
  engine     = "pg"
  version    = "15"
  size       = "db-s-2vcpu-4gb"
  region     = var.region
  node_count = var.environment == "production" ? 2 : 1

  private_network_uuid = digitalocean_vpc.main.id
}

# Redis
resource "digitalocean_database_cluster" "redis" {
  name       = "syncwatch-redis-${var.environment}"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-2gb"
  region     = var.region
  node_count = 1

  private_network_uuid = digitalocean_vpc.main.id
}

# Object Storage (Spaces)
resource "digitalocean_spaces_bucket" "media" {
  name   = "syncwatch-media-${var.environment}"
  region = var.region
  acl    = "private"

  cors_rule {
    allowed_origins = ["https://syncwatch.example"]
    allowed_methods = ["GET", "PUT"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

# TURN Server
resource "digitalocean_droplet" "turn" {
  name     = "syncwatch-turn-${var.environment}"
  image    = "ubuntu-22-04-x64"
  size     = "s-2vcpu-4gb"
  region   = var.region
  vpc_uuid = digitalocean_vpc.main.id

  user_data = templatefile("${path.module}/scripts/turn-setup.sh", {
    turn_secret = var.turn_secret
    realm       = "syncwatch.example"
  })
}

# Kubernetes Cluster
resource "digitalocean_kubernetes_cluster" "main" {
  name         = "syncwatch-${var.environment}"
  region       = var.region
  version      = "1.28.2-do.0"
  vpc_uuid     = digitalocean_vpc.main.id

  node_pool {
    name       = "default"
    size       = "s-4vcpu-8gb"
    auto_scale = true
    min_nodes  = 2
    max_nodes  = 10
  }
}

# CDN
resource "digitalocean_cdn" "media" {
  origin         = digitalocean_spaces_bucket.media.bucket_domain_name
  custom_domain  = "cdn.syncwatch.example"
  certificate_id = digitalocean_certificate.cdn.id
}

# Outputs
output "database_uri" {
  value     = digitalocean_database_cluster.postgres.private_uri
  sensitive = true
}

output "redis_uri" {
  value     = digitalocean_database_cluster.redis.private_uri
  sensitive = true
}

output "turn_ip" {
  value = digitalocean_droplet.turn.ipv4_address
}
```

### 11.2 Environment Provisioning

```bash
# infrastructure/scripts/provision.sh

#!/bin/bash
set -euo pipefail

ENVIRONMENT=${1:-staging}

echo "Provisioning $ENVIRONMENT environment..."

# Initialize Terraform
cd infrastructure/
terraform init -backend-config="key=${ENVIRONMENT}/terraform.tfstate"

# Plan changes
terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan

# Apply (requires manual approval for production)
if [ "$ENVIRONMENT" == "production" ]; then
  echo "Production deployment requires manual approval"
  read -p "Apply changes? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled"
    exit 1
  fi
fi

terraform apply tfplan

# Output connection strings (stored securely)
terraform output -json > outputs.json
```

---

## 12. Reliability & Disaster Recovery

### 12.1 Backup & Restore

> **Production without backups is not production.**

#### 12.1.1 Backup Strategy

| Component | Backup Type | Frequency | Retention | Storage |
|-----------|-------------|-----------|-----------|---------|
| PostgreSQL | Full + WAL | Daily + Continuous | 30 days | S3 |
| Redis | RDB Snapshot | Hourly | 7 days | S3 |
| MinIO | Cross-region replication | Continuous | Indefinite | Secondary region |
| Config | Git | On change | Indefinite | GitHub |

#### 12.1.2 PostgreSQL Backup

```bash
# scripts/backup-postgres.sh
#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="syncwatch_${TIMESTAMP}.sql.gz"
S3_BUCKET="syncwatch-backups"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d syncwatch \
  --format=custom \
  --compress=9 \
  | aws s3 cp - "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}"

# Verify backup
aws s3 ls "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}"

# Cleanup old backups (keep 30 days)
aws s3 ls "s3://${S3_BUCKET}/postgres/" \
  | awk '{print $4}' \
  | sort -r \
  | tail -n +31 \
  | xargs -I {} aws s3 rm "s3://${S3_BUCKET}/postgres/{}"

echo "Backup completed: ${BACKUP_FILE}"
```

#### 12.1.3 Backup Verification

```typescript
// scripts/verify-backup.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';

async function verifyBackup(backupKey: string): Promise<VerifyResult> {
  // 1. Download backup to temp location
  const tempFile = `/tmp/verify_${Date.now()}.sql.gz`;
  await downloadFromS3(backupKey, tempFile);

  // 2. Create test database
  const testDb = `verify_${Date.now()}`;
  await exec(`createdb ${testDb}`);

  try {
    // 3. Restore backup
    await exec(`pg_restore -d ${testDb} ${tempFile}`);

    // 4. Run integrity checks
    const checks = await runIntegrityChecks(testDb);

    return {
      success: checks.every(c => c.passed),
      checks,
      restoredAt: new Date(),
    };
  } finally {
    // 5. Cleanup
    await exec(`dropdb ${testDb}`);
    await fs.unlink(tempFile);
  }
}

// Run weekly
schedule.scheduleJob('0 4 * * 0', async () => {
  const latestBackup = await getLatestBackup();
  const result = await verifyBackup(latestBackup);

  if (!result.success) {
    await sendAlert('Backup verification failed', result);
  }
});
```

### 12.2 Disaster Recovery Plan

#### 12.2.1 Failure Scenarios & Recovery

| Scenario | Detection | Recovery Time | Recovery Steps |
|----------|-----------|---------------|----------------|
| Redis failure | Health check fails | 5-10 min | Failover to replica, warm cache |
| PostgreSQL failure | Health check fails | 15-30 min | Failover to read replica, promote |
| MinIO segment loss | 404 on HLS segments | 1-4 hours | Restore from backup region |
| TURN unavailable | ICE failures spike | 5 min | DNS failover to backup TURN |
| Full region outage | All health checks fail | 1-4 hours | Failover to secondary region |

#### 12.2.2 Redis Failure Recovery

```typescript
// Redis failure handling
class RedisFailoverHandler {
  private readonly primaryUrl: string;
  private readonly replicaUrl: string;
  private currentConnection: RedisClient;

  async handleFailure(): Promise<void> {
    logger.warn('Primary Redis failed, initiating failover');

    // 1. Switch to replica
    this.currentConnection = await createRedisClient(this.replicaUrl);

    // 2. Notify services to reconnect
    await this.broadcastReconnect();

    // 3. Rooms will be in "degraded" mode
    // State is lost, but clients will resync on reconnect

    // 4. Alert ops team
    await sendAlert('Redis failover executed', {
      fromPrimary: this.primaryUrl,
      toReplica: this.replicaUrl,
    });
  }
}
```

#### 12.2.3 MinIO Recovery

```typescript
// HLS segment recovery
async function recoverMissingSegments(videoId: string): Promise<void> {
  const manifest = await getManifest(videoId);
  const segments = parseSegmentUrls(manifest);

  const missingSegments: string[] = [];

  // Check each segment
  for (const segment of segments) {
    const exists = await checkSegmentExists(segment);
    if (!exists) {
      missingSegments.push(segment);
    }
  }

  if (missingSegments.length === 0) {
    return;
  }

  logger.warn({ videoId, count: missingSegments.length }, 'Missing segments detected');

  // Option 1: Restore from backup region
  for (const segment of missingSegments) {
    await restoreFromBackupRegion(segment);
  }

  // Option 2: Re-transcode (if original file exists)
  if (missingSegments.length > segments.length * 0.5) {
    // More than 50% missing - full re-transcode
    await queueRetranscode(videoId);
  }
}
```

#### 12.2.4 TURN Failover

```typescript
// TURN server failover
const turnServers = {
  primary: {
    urls: ['turn:turn1.syncwatch.example:3478'],
    priority: 1,
  },
  backup: {
    urls: ['turn:turn2.syncwatch.example:3478'],
    priority: 2,
  },
};

async function getTurnServers(): Promise<TurnServer[]> {
  // Check primary health
  const primaryHealthy = await checkTurnHealth(turnServers.primary.urls[0]);

  if (primaryHealthy) {
    return [turnServers.primary, turnServers.backup];
  } else {
    // Failover: return backup first
    logger.warn('TURN primary unhealthy, using backup');
    return [turnServers.backup, turnServers.primary];
  }
}
```

---

## 13. Operations Documentation

> **README is for developers. Operations needs dedicated documentation.**

### 13.1 Required Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `docs/DEPLOYMENT.md` | Step-by-step deployment guide | DevOps, SRE |
| `docs/OPERATIONS.md` | Day-to-day operational procedures | On-call engineers |
| `docs/INCIDENTS.md` | Incident response playbooks | On-call engineers |
| `docs/RUNBOOKS.md` | Troubleshooting guides | All engineers |

### 13.2 Operations Checklist

```markdown
# docs/OPERATIONS.md

## Daily Operations

### Health Checks
- [ ] Verify all services healthy: `curl https://api.syncwatch.example/health/ready`
- [ ] Check Prometheus alerts: No firing alerts
- [ ] Review error rates in Grafana: < 0.1% 5xx errors
- [ ] Check transcoding queue depth: < 5 pending jobs

### Monitoring
- [ ] Check disk usage: < 80% on all volumes
- [ ] Check memory usage: < 80% on all services
- [ ] Check database connections: < 80% of pool
- [ ] Check Redis memory: < 80% of maxmemory

## Weekly Operations

### Backups
- [ ] Verify latest PostgreSQL backup exists
- [ ] Run backup restoration test (staging)
- [ ] Check backup retention policy

### Security
- [ ] Review access logs for anomalies
- [ ] Check for security advisory updates
- [ ] Rotate TURN credentials

### Performance
- [ ] Review p95 latency trends
- [ ] Check sync drift metrics
- [ ] Review transcoding durations
```

### 13.3 Incident Response

```markdown
# docs/INCIDENTS.md

## Incident Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| SEV1 | Complete outage | 15 min | All users affected |
| SEV2 | Major degradation | 30 min | Sync broken, uploads failing |
| SEV3 | Minor degradation | 2 hours | Slow transcoding |
| SEV4 | Cosmetic/minor | 24 hours | UI glitches |

## Incident Playbooks

### Playbook: High Playback Drift

**Symptoms**:
- Alert: HighPlaybackDrift firing
- User reports: "Video is out of sync"

**Investigation**:
1. Check sync command latency: `promql: syncwatch_sync_command_latency_ms{quantile="0.95"}`
2. Check WebSocket connection health
3. Check Redis latency

**Resolution**:
1. If Redis latency high: Scale Redis / check memory
2. If WebSocket issues: Restart affected backend pod
3. If client-side: Request user browser console logs

### Playbook: Transcoding Jobs Stuck

**Symptoms**:
- Alert: TranscodingBacklog firing
- Queue depth > 10 for > 10 minutes

**Investigation**:
1. Check worker health: `curl http://transcoder:4001/health/transcoder`
2. Check FFmpeg processes: `docker exec transcoder ps aux | grep ffmpeg`
3. Check disk space: `df -h /storage`

**Resolution**:
1. If stuck process: Kill and retry
2. If disk full: Cleanup old segments, scale storage
3. If worker unhealthy: Restart worker pod
```

---

## 14. Work Plan

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
