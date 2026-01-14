# Transcoding Worker

Background worker service that processes video transcoding jobs using FFmpeg.

## Features

- **Adaptive Bitrate Streaming**: Generates multiple quality variants (720p, 480p, 360p) based on source resolution
- **HLS Output**: Converts videos to HLS format for efficient streaming
- **Metadata Extraction**: Probes video files for duration, resolution, and other metadata
- **Progress Tracking**: Real-time progress updates stored in Redis and database
- **Error Handling**: Automatic retries with exponential backoff (max 3 attempts)
- **Database Integration**: Updates Video records in PostgreSQL via Prisma
- **Timeout Protection**: Prevents jobs from running indefinitely (2-hour timeout)
- **Cleanup**: Automatic cleanup of temporary files after processing

## Architecture

```
Queue Job → Download from MinIO → Probe Metadata → Transcode Variants → Upload to MinIO → Update Database
```

### Transcoding Flow

1. **Download** (0-10%): Fetch input video from MinIO `videos` bucket
2. **Probe** (10-15%): Extract metadata (duration, resolution)
3. **Transcode** (15-85%): Generate HLS variants in parallel
   - 720p @ 2800kbps (if source ≥ 720p)
   - 480p @ 1400kbps (if source ≥ 480p)
   - 360p @ 800kbps
4. **Master Playlist** (85-90%): Generate adaptive streaming playlist
5. **Upload** (90-100%): Upload HLS segments to MinIO `hls` bucket
6. **Finalize**: Update Video status to `ready` with manifest URL

### Output Structure

```
hls/{videoId}/
├── master.m3u8              # Master playlist for adaptive streaming
├── 720p/
│   ├── playlist.m3u8
│   ├── segment_000.ts
│   └── ...
├── 480p/
│   ├── playlist.m3u8
│   └── ...
└── 360p/
    ├── playlist.m3u8
    └── ...
```

## Configuration

Environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string for Bull queue
- `MINIO_ENDPOINT`: MinIO server endpoint
- `MINIO_PORT`: MinIO server port
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key
- `WORKER_CONCURRENCY`: Number of concurrent jobs (default: 1)
- `LOG_LEVEL`: Logging level (default: info)

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Start worker
npm run dev

# Build for production
npm run build
npm start
```

## Error Handling

The worker implements robust error handling:

- **Retry Logic**: Failed jobs retry after 1min, 5min, 15min (max 3 attempts)
- **Status Updates**: Video status updated to `failed` with error message
- **Cleanup**: Partial outputs cleaned up on failure
- **Logging**: Full error context logged for debugging

## Testing

```bash
npm test
```

## Dependencies

- **FFmpeg**: Video transcoding engine (installed in Docker)
- **fluent-ffmpeg**: Node.js wrapper for FFmpeg
- **BullMQ**: Job queue for Redis
- **Prisma**: Database ORM
- **MinIO**: S3-compatible object storage
- **Pino**: Logging
