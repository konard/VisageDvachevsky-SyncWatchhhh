# SyncWatch Environment Variables Reference

This document describes all environment variables used in SyncWatch. Copy `.env.example` to `.env` and customize values for your environment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Server Configuration](#server-configuration)
3. [Database](#database)
4. [Redis](#redis)
5. [MinIO / S3 Storage](#minio--s3-storage)
6. [JWT Authentication](#jwt-authentication)
7. [CORS](#cors)
8. [WebSocket](#websocket)
9. [Limits & Quotas](#limits--quotas)
10. [Video Settings](#video-settings)
11. [Rate Limiting](#rate-limiting)
12. [Production Checklist](#production-checklist)

---

## Quick Start

### Development

```bash
# Copy example environment file
cp backend/.env.example backend/.env

# Start infrastructure services
docker compose -f docker-compose.dev.yml up db redis minio minio-init -d

# Development servers will use default values from .env.example
npm run dev
```

### Production

See [Production Checklist](#production-checklist) for required changes.

---

## Server Configuration

### `NODE_ENV`

**Description**: Application environment
**Type**: `string`
**Options**: `development` | `production` | `test`
**Default**: `development`
**Required**: No

**Usage:**
```bash
NODE_ENV=production
```

**Notes:**
- In `production`: Enables optimizations, disables debug logs
- In `development`: Enables verbose logging, hot reload
- In `test`: Uses in-memory databases, mocks external services

---

### `PORT`

**Description**: HTTP server port
**Type**: `number`
**Default**: `4000`
**Required**: No

**Usage:**
```bash
PORT=4000
```

**Notes:**
- Frontend expects backend on port 4000 in development
- Change `VITE_API_URL` in frontend if using different port

---

### `HOST`

**Description**: Server bind address
**Type**: `string`
**Default**: `0.0.0.0` (all interfaces)
**Required**: No

**Usage:**
```bash
HOST=0.0.0.0
```

**Notes:**
- Use `0.0.0.0` for Docker containers
- Use `127.0.0.1` to bind localhost only

---

## Database

### `DATABASE_URL`

**Description**: PostgreSQL connection string
**Type**: `string`
**Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
**Default**: `postgresql://test:test@localhost:5432/test`
**Required**: Yes

**Usage:**
```bash
DATABASE_URL="postgresql://syncwatch:syncwatch_dev@localhost:5432/syncwatch"
```

**Production Example:**
```bash
DATABASE_URL="postgresql://user:password@db.example.com:5432/syncwatch?sslmode=require"
```

**Notes:**
- Use SSL in production: append `?sslmode=require`
- Connection pooling is handled by Prisma (default: 10 connections)
- For connection pool tuning, see [Prisma Connection Pool](https://www.prisma.io/docs/concepts/components/prisma-client/connection-pool)

---

## Redis

### `REDIS_HOST`

**Description**: Redis server hostname
**Type**: `string`
**Default**: `localhost`
**Required**: Yes

**Usage:**
```bash
REDIS_HOST=localhost
```

---

### `REDIS_PORT`

**Description**: Redis server port
**Type**: `number`
**Default**: `6379`
**Required**: Yes

**Usage:**
```bash
REDIS_PORT=6379
```

---

### `REDIS_PASSWORD`

**Description**: Redis authentication password
**Type**: `string`
**Default**: None
**Required**: No (Yes in production)

**Usage:**
```bash
REDIS_PASSWORD=your_secure_redis_password
```

**Notes:**
- **REQUIRED** in production
- Use strong random password (32+ characters)

---

### Alternative: `REDIS_URL`

**Description**: Complete Redis connection URL (alternative to individual vars)
**Type**: `string`
**Format**: `redis://[:PASSWORD@]HOST:PORT[/DATABASE]`

**Usage:**
```bash
# Without password
REDIS_URL="redis://localhost:6379"

# With password
REDIS_URL="redis://:your_password@redis.example.com:6379/0"

# With TLS
REDIS_URL="rediss://:your_password@redis.example.com:6380/0"
```

---

## MinIO / S3 Storage

### `MINIO_ENDPOINT`

**Description**: MinIO server hostname (without protocol)
**Type**: `string`
**Default**: `localhost`
**Required**: Yes

**Usage:**
```bash
MINIO_ENDPOINT=localhost
```

**Production (S3):**
```bash
MINIO_ENDPOINT=s3.amazonaws.com
# or
MINIO_ENDPOINT=nyc3.digitaloceanspaces.com
```

---

### `MINIO_PORT`

**Description**: MinIO server port
**Type**: `number`
**Default**: `9000`
**Required**: Yes

**Usage:**
```bash
MINIO_PORT=9000
```

**Notes:**
- Use `443` for AWS S3 or other cloud providers with SSL

---

### `MINIO_USE_SSL`

**Description**: Use HTTPS for MinIO connections
**Type**: `boolean`
**Default**: `false`
**Required**: Yes

**Usage:**
```bash
MINIO_USE_SSL=false  # Development
MINIO_USE_SSL=true   # Production
```

---

### `MINIO_ACCESS_KEY`

**Description**: MinIO access key (AWS Access Key ID)
**Type**: `string`
**Default**: `test_minio_access_key`
**Required**: Yes

**Usage:**
```bash
MINIO_ACCESS_KEY=syncwatch
```

**Production:**
```bash
MINIO_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE  # AWS format
```

---

### `MINIO_SECRET_KEY`

**Description**: MinIO secret key (AWS Secret Access Key)
**Type**: `string`
**Default**: `test_minio_secret_key`
**Required**: Yes

**Usage:**
```bash
MINIO_SECRET_KEY=syncwatch_dev
```

**Production:**
```bash
MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Security:**
- Never commit this to version control
- Use secret management (AWS Secrets Manager, HashiCorp Vault, etc.)

---

### `MINIO_BUCKET`

**Description**: S3 bucket name for video storage
**Type**: `string`
**Default**: `syncwatch-videos`
**Required**: Yes

**Usage:**
```bash
MINIO_BUCKET=syncwatch-videos
```

**Notes:**
- Bucket must exist before starting the server
- Use `minio-init` service in docker-compose to auto-create

---

## JWT Authentication

### `JWT_SECRET`

**Description**: Secret key for signing JWT tokens
**Type**: `string`
**Minimum Length**: 32 characters
**Default**: Test secret (insecure)
**Required**: Yes

**Usage:**
```bash
JWT_SECRET="change_this_to_a_secure_random_string_at_least_32_characters_long"
```

**Generate Secure Secret:**
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Security:**
- **CRITICAL**: Change this in production
- Never share or commit to version control
- Rotating this invalidates all existing tokens

---

### `JWT_EXPIRES_IN` (or `JWT_ACCESS_EXPIRES_IN`)

**Description**: Access token expiration time
**Type**: `string` (time duration)
**Default**: `15m` (15 minutes)
**Required**: No

**Usage:**
```bash
JWT_EXPIRES_IN=15m
```

**Format:**
- `s` - seconds
- `m` - minutes
- `h` - hours
- `d` - days

**Examples:**
```bash
JWT_EXPIRES_IN=15m   # 15 minutes
JWT_EXPIRES_IN=1h    # 1 hour
JWT_EXPIRES_IN=30s   # 30 seconds
```

**Recommendations:**
- Development: `15m` - `1h`
- Production: `5m` - `30m` (shorter is more secure)

---

### `JWT_REFRESH_EXPIRES_IN`

**Description**: Refresh token expiration time
**Type**: `string` (time duration)
**Default**: `7d` (7 days)
**Required**: No

**Usage:**
```bash
JWT_REFRESH_EXPIRES_IN=7d
```

**Recommendations:**
- Development: `7d`
- Production: `7d` - `30d`

---

## CORS

### `CORS_ORIGIN`

**Description**: Allowed CORS origin(s) for frontend
**Type**: `string` (URL or comma-separated URLs)
**Default**: `http://localhost:3000`
**Required**: Yes

**Usage:**
```bash
# Single origin
CORS_ORIGIN=http://localhost:3000

# Multiple origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,https://app.syncwatch.com,https://www.syncwatch.com
```

**Production:**
```bash
CORS_ORIGIN=https://syncwatch.com
```

**Notes:**
- Must match frontend URL exactly (including protocol and port)
- Do NOT use `*` in production

---

## WebSocket

### `WS_PING_TIMEOUT`

**Description**: WebSocket ping timeout (ms)
**Type**: `number`
**Default**: `10000` (10 seconds)
**Required**: No

**Usage:**
```bash
WS_PING_TIMEOUT=10000
```

**Notes:**
- How long to wait for pong response before disconnecting client

---

### `WS_PING_INTERVAL`

**Description**: WebSocket ping interval (ms)
**Type**: `number`
**Default**: `25000` (25 seconds)
**Required**: No

**Usage:**
```bash
WS_PING_INTERVAL=25000
```

**Notes:**
- How often to send ping to keep connection alive
- Should be less than proxy/load balancer timeout

---

## Limits & Quotas

### `MAX_UPLOAD_SIZE`

**Description**: Maximum video upload size (bytes)
**Type**: `number`
**Default**: `8589934592` (8 GB)
**Required**: No

**Usage:**
```bash
MAX_UPLOAD_SIZE=8589934592  # 8 GB
```

**Conversions:**
```bash
1 GB  = 1073741824
2 GB  = 2147483648
5 GB  = 5368709120
8 GB  = 8589934592
10 GB = 10737418240
```

**Notes:**
- Must also configure nginx/proxy max body size
- Consider storage costs when increasing

---

### `MAX_VIDEO_DURATION`

**Description**: Maximum video duration (seconds)
**Type**: `number`
**Default**: `10800` (3 hours)
**Required**: No

**Usage:**
```bash
MAX_VIDEO_DURATION=10800  # 3 hours
```

**Conversions:**
```bash
1 hour  = 3600
2 hours = 7200
3 hours = 10800
4 hours = 14400
```

---

### `MAX_ROOM_PARTICIPANTS`

**Description**: Maximum participants per room
**Type**: `number`
**Default**: `5`
**Required**: No

**Usage:**
```bash
MAX_ROOM_PARTICIPANTS=5
```

**Notes:**
- Affects voice quality (WebRTC mesh scales poorly beyond 5-6)
- Consider SFU for larger groups

---

## Video Settings

### `VIDEO_EXPIRY_HOURS`

**Description**: Hours until uploaded videos expire
**Type**: `number`
**Default**: `72` (3 days)
**Required**: No

**Usage:**
```bash
VIDEO_EXPIRY_HOURS=72
```

**Notes:**
- Cleanup job deletes expired videos from storage
- Set to `0` to disable expiration

---

## Rate Limiting

### `RATE_LIMIT_MAX`

**Description**: Maximum requests per window
**Type**: `number`
**Default**: `100`
**Required**: No

**Usage:**
```bash
RATE_LIMIT_MAX=100
```

---

### `RATE_LIMIT_WINDOW_MS`

**Description**: Rate limit window duration (milliseconds)
**Type**: `number`
**Default**: `60000` (1 minute)
**Required**: No

**Usage:**
```bash
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
```

**Combined Example:**
```bash
# 100 requests per minute
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Production Checklist

Before deploying to production, ensure these variables are set:

### Required Changes

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` - Generate secure random string (32+ chars)
- [ ] `DATABASE_URL` - Use production database with SSL
- [ ] `REDIS_PASSWORD` - Set strong password
- [ ] `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` - Use production credentials
- [ ] `MINIO_USE_SSL=true`
- [ ] `CORS_ORIGIN` - Set to production frontend URL

### Security Hardening

- [ ] All secrets stored in secret manager (not .env files)
- [ ] Database uses SSL (`?sslmode=require`)
- [ ] Redis requires authentication
- [ ] CORS allows only specific origins (no `*`)
- [ ] Rate limiting enabled and tuned

### Recommended Changes

- [ ] `JWT_EXPIRES_IN` - Shorter for better security (5m - 15m)
- [ ] `MAX_UPLOAD_SIZE` - Adjust based on storage capacity
- [ ] `VIDEO_EXPIRY_HOURS` - Adjust based on retention policy

---

## Example Configurations

### Development (.env.example)

```bash
# Server
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://syncwatch:syncwatch_dev@localhost:5432/syncwatch"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=syncwatch
MINIO_SECRET_KEY=syncwatch_dev
MINIO_BUCKET=syncwatch-videos

# JWT
JWT_SECRET="change_this_to_a_secure_random_string_at_least_32_characters_long"
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Limits
MAX_UPLOAD_SIZE=8589934592
MAX_VIDEO_DURATION=10800
MAX_ROOM_PARTICIPANTS=5
```

### Production (example)

```bash
# Server
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:pass@db.example.com:5432/syncwatch?sslmode=require"

# Redis
REDIS_URL="rediss://:your_password@redis.example.com:6380/0"

# S3 (AWS)
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=${AWS_ACCESS_KEY_ID}
MINIO_SECRET_KEY=${AWS_SECRET_ACCESS_KEY}
MINIO_BUCKET=syncwatch-production-videos

# JWT
JWT_SECRET=${JWT_SECRET_FROM_SECRETS_MANAGER}
JWT_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://syncwatch.com

# Limits
MAX_UPLOAD_SIZE=8589934592
MAX_VIDEO_DURATION=10800
MAX_ROOM_PARTICIPANTS=5

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Troubleshooting

### "DATABASE_URL is required"

Ensure `DATABASE_URL` is set in your `.env` file.

### "ECONNREFUSED" Redis errors

Check that Redis is running and `REDIS_HOST` / `REDIS_PORT` are correct.

### "MinIO connection failed"

Verify MinIO credentials and endpoint are correct. Check SSL setting matches server configuration.

### "CORS error" in browser

Ensure `CORS_ORIGIN` matches your frontend URL exactly (including protocol and port).

---

For more details on deployment, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
