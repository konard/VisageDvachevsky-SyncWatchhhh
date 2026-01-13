# SyncWatch - Technical Specification

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Feature Specifications](#4-feature-specifications)
5. [API Design](#5-api-design)
6. [Database Schema](#6-database-schema)
7. [Security Considerations](#7-security-considerations)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Work Plan](#9-work-plan)

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
- **Redis**: Sessions, room state, pub/sub for horizontal scaling
- **MinIO/S3**: Video files, HLS segments

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

### 3.4 Optional/Future
| Category | Technology | Use Case |
|----------|------------|----------|
| SFU | Mediasoup / LiveKit | Scalable voice (if P2P insufficient) |
| CDN | CloudFlare / BunnyCDN | Video delivery optimization |
| Monitoring | Prometheus + Grafana | Production metrics |
| TURN | Coturn | WebRTC NAT traversal |

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
```

### 4.2 Video Synchronization Protocol

#### 4.2.1 Server State
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
}
```

#### 4.2.2 Sync Commands
```typescript
type SyncCommand =
  | { type: 'PLAY'; atServerTime: number }
  | { type: 'PAUSE'; atServerTime: number }
  | { type: 'SEEK'; targetMediaTime: number; atServerTime: number }
  | { type: 'SET_RATE'; rate: number; atServerTime: number }
  | { type: 'STATE_SNAPSHOT'; state: PlaybackState };
```

#### 4.2.3 Client Algorithm
```
1. Receive command with atServerTime
2. Calculate localTime = atServerTime - clockOffset
3. If localTime is in future:
   - Schedule action at localTime
4. If localTime is in past (by small margin):
   - Execute immediately with position compensation
5. Periodically check sync:
   - Calculate expected position: anchorMediaTime + (now - anchorServerTime)
   - Get actual player position
   - If |delta| < 200ms: adjust rate (1.02 or 0.98)
   - If |delta| >= 500ms: hard seek
```

### 4.3 Voice Chat

#### 4.3.1 Architecture
For 5 participants, P2P mesh creates 10 connections (n*(n-1)/2).
This is acceptable for MVP but SFU should be prepared for future.

```
Participant A ←→ Participant B
      ↑   ↘    ↗    ↑
      │     ↘↗      │
      ↓    ↗  ↘     ↓
Participant C ←→ Participant D
           ↖   ↗
             E
```

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

### 4.5 Video Transcoding

#### 4.5.1 Pipeline
```
Upload → Validation → Queue → FFmpeg Worker → HLS Output → Storage
```

#### 4.5.2 FFmpeg Settings
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

#### 4.5.3 Transcoding States
```
PENDING → PROCESSING (0-100%) → READY | FAILED
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

## 8. Deployment Architecture

### 8.1 Development Environment
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

### 8.2 Production Considerations
- Horizontal scaling with Redis pub/sub
- CDN for video segment delivery
- Database read replicas
- Container orchestration (K8s or Docker Swarm)
- TURN server for WebRTC NAT traversal

---

## 9. Work Plan

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
