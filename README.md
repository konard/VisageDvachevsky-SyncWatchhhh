# SyncWatch

<p align="center">
  <img src="logo.png" alt="SyncWatch Logo" width="200">
</p>

<p align="center">
  <strong>Watch together, perfectly synchronized</strong>
</p>

<p align="center">
  A web service for synchronized video watching with up to 5 participants
</p>

---

## Features

- **Synchronized Playback** - Watch videos in perfect sync with friends (< 300ms drift)
- **Multiple Sources** - Upload files, YouTube links, or external video URLs
- **Voice Chat** - WebRTC-based audio with push-to-talk and voice activation modes
- **Text Chat** - Real-time messaging with system events
- **Liquid Glass UI** - Modern, beautiful interface with smooth animations
- **Easy Sharing** - Join rooms with simple invite links
- **User Accounts** - Register, login, and manage friends

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Fastify, Socket.io, Prisma |
| Database | PostgreSQL, Redis |
| Storage | MinIO (S3-compatible) |
| Transcoding | FFmpeg |
| Voice | WebRTC P2P Mesh |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/VisageDvachevsky/SyncWatchhhh.git
   cd SyncWatchhhh
   ```

2. **Start infrastructure services**
   ```bash
   docker compose -f docker-compose.dev.yml up db redis minio minio-init -d
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - MinIO Console: http://localhost:9001

### Full Docker Development

Run everything in containers:
```bash
docker compose -f docker-compose.dev.yml up --build
```

## Project Structure

```
syncwatch/
├── frontend/          # React SPA
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom hooks
│   │   ├── stores/       # Zustand stores
│   │   ├── services/     # API clients
│   │   └── utils/        # Utilities
│   └── public/
├── backend/           # Node.js API
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── common/       # Shared utilities
│   │   └── websocket/    # Socket.io handlers
│   └── prisma/           # Database schema
├── transcoder/        # FFmpeg worker
├── shared/            # Shared types
└── docs/              # Documentation
```

## Documentation

- [Technical Specification](docs/TECHNICAL_SPECIFICATION.md)
- [Architecture](docs/ARCHITECTURE.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [HLS.js](https://github.com/video-dev/hls.js) - HLS playback
- [Socket.io](https://socket.io/) - Real-time communication
- [FFmpeg](https://ffmpeg.org/) - Video transcoding
