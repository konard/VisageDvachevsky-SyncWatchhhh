# SyncWatch Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTS                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Desktop   │  │   Mobile    │  │   Tablet    │  │   Other     │             │
│  │   Browser   │  │   Browser   │  │   Browser   │  │   Browsers  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                │                     │
│         └────────────────┴────────────────┴────────────────┘                     │
│                                    │                                             │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        │      Load Balancer      │
                        │    (Nginx/Traefik)      │
                        │         + TLS           │
                        └────────────┬────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Static Files  │        │   API Server    │        │   WebSocket     │
│   (Frontend)    │        │   (REST API)    │        │   Server        │
│                 │        │                 │        │   (Socket.io)   │
└─────────────────┘        └────────┬────────┘        └────────┬────────┘
                                    │                          │
                           ┌────────┴──────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │
│  │   Auth Service   │  │   Room Service   │  │   Sync Service   │               │
│  │                  │  │                  │  │                  │               │
│  │  - Registration  │  │  - Create/Join   │  │  - State Mgmt    │               │
│  │  - Login/Logout  │  │  - Invite Links  │  │  - Commands      │               │
│  │  - JWT Tokens    │  │  - Permissions   │  │  - Clock Sync    │               │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘               │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │
│  │   Chat Service   │  │   Voice Service  │  │  Video Service   │               │
│  │                  │  │                  │  │                  │               │
│  │  - Messages      │  │  - Signaling     │  │  - Upload        │               │
│  │  - History       │  │  - ICE Exchange  │  │  - Transcoding   │               │
│  │  - Events        │  │  - Peer Mgmt     │  │  - HLS Delivery  │               │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                           │
│                                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │
│  │    PostgreSQL    │  │      Redis       │  │   MinIO (S3)     │               │
│  │                  │  │                  │  │                  │               │
│  │  - Users         │  │  - Sessions      │  │  - Video Files   │               │
│  │  - Rooms         │  │  - Room State    │  │  - HLS Segments  │               │
│  │  - Friendships   │  │  - Pub/Sub       │  │  - Thumbnails    │               │
│  │  - Chat History  │  │  - Rate Limits   │  │                  │               │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘               │
│                                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Transcoding Worker                                 │   │
│  │                                                                           │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │   │
│  │  │  Bull Queue │───▶│   FFmpeg    │───▶│  HLS Output │                  │   │
│  │  │  (Redis)    │    │   Worker    │    │  (MinIO)    │                  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘                  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Room Creation Flow
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │ Postgres │     │  Redis   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /rooms    │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │ INSERT room    │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │ Initialize state               │
     │                │────────────────────────────────▶
     │                │                │                │
     │  { code, id }  │                │                │
     │◀───────────────│                │                │
     │                │                │                │
```

### 2. Video Synchronization Flow
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Owner   │     │  Server  │     │  Redis   │     │ Viewers  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ sync:play      │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │ Update state   │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │ Publish event  │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │ Subscribe      │
     │                │                │◀───────────────│
     │                │                │                │
     │                │                │  sync:command  │
     │                │                │───────────────▶│
     │                │                │                │
```

### 3. Video Upload & Transcoding Flow
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │  MinIO   │     │  Queue   │     │  FFmpeg  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ Upload file    │                │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │                │ Store original │                │                │
     │                │───────────────▶│                │                │
     │                │                │                │                │
     │                │ Add job        │                │                │
     │                │───────────────────────────────▶│                │
     │                │                │                │                │
     │ { videoId }    │                │                │                │
     │◀───────────────│                │                │                │
     │                │                │                │                │
     │                │                │                │ Process job    │
     │                │                │                │───────────────▶│
     │                │                │                │                │
     │                │                │                │ Transcode      │
     │                │                │◀───────────────────────────────│
     │                │                │                │                │
     │ Poll status    │                │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │ { progress }   │                │                │                │
     │◀───────────────│                │                │                │
```

### 4. Voice Chat WebRTC Flow
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  User A  │     │  Server  │     │  User B  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ voice:join     │                │
     │───────────────▶│                │
     │                │                │
     │                │ voice:peer:joined
     │                │───────────────▶│
     │                │                │
     │                │ voice:signal (offer)
     │                │◀───────────────│
     │                │                │
     │ voice:signal   │                │
     │◀───────────────│                │
     │                │                │
     │ voice:signal (answer)           │
     │───────────────▶│                │
     │                │                │
     │                │ voice:signal   │
     │                │───────────────▶│
     │                │                │
     │◀═══════════════════════════════▶│
     │        P2P Audio Stream         │
     │                │                │
```

## Component Details

### Frontend Architecture
```
src/
├── components/           # React components
│   ├── ui/              # Design system (liquid glass)
│   ├── player/          # Video players (HLS, YouTube)
│   ├── chat/            # Text chat components
│   ├── voice/           # Voice chat components
│   └── room/            # Room management
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
├── services/            # API & WebSocket services
├── utils/               # Utilities (sync, time)
└── types/               # TypeScript types
```

### Backend Architecture
```
src/
├── modules/
│   ├── auth/            # Authentication
│   ├── rooms/           # Room management
│   ├── sync/            # Playback synchronization
│   ├── chat/            # Text messaging
│   ├── voice/           # WebRTC signaling
│   └── videos/          # Upload & transcoding
├── common/              # Shared utilities
├── database/            # Prisma client
└── websocket/           # Socket.io handlers
```

## Security Architecture

```
                    ┌─────────────────────────────────────┐
                    │           TLS Termination           │
                    │         (HTTPS/WSS only)            │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │           Rate Limiting             │
                    │    (requests, uploads, messages)    │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   JWT Auth      │        │  Input Valid.   │        │   CORS/CSP      │
│                 │        │                 │        │                 │
│  - Access (15m) │        │  - Zod schemas  │        │  - Whitelist    │
│  - Refresh (7d) │        │  - File checks  │        │  - Frame-opts   │
│  - Secure flag  │        │  - Size limits  │        │  - XSS protect  │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

## Scaling Considerations

### Horizontal Scaling
```
                         ┌─────────────────┐
                         │  Load Balancer  │
                         └────────┬────────┘
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       ▼                          ▼                          ▼
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│  Server 1   │           │  Server 2   │           │  Server N   │
└──────┬──────┘           └──────┬──────┘           └──────┬──────┘
       │                         │                         │
       └─────────────────────────┼─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Redis (Pub/Sub)       │
                    │   - State sync          │
                    │   - Message broadcast   │
                    │   - Session store       │
                    └─────────────────────────┘
```

### Key Points for Scale
1. **Stateless API servers** - All state in Redis/PostgreSQL
2. **Redis Pub/Sub** - Broadcast events across instances
3. **Sticky sessions** - Socket.io connections stay on same server
4. **CDN** - Video segments served from edge locations
5. **Queue workers** - Separate transcoding from API servers
