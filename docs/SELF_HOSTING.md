# SyncWatch Self-Hosting Guide

This guide helps you deploy and operate your own SyncWatch instance.

## Table of Contents

1. [Minimum Requirements](#minimum-requirements)
2. [Quick Start](#quick-start)
3. [Resource Sizing](#resource-sizing)
4. [Configuration Reference](#configuration-reference)
5. [Security Checklist](#security-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Minimum Requirements

### Hardware

| Deployment Size | Users | CPU | RAM | Storage | Bandwidth |
|----------------|-------|-----|-----|---------|-----------|
| **Small** | 1-50 | 2 cores | 4 GB | 50 GB | 100 Mbps |
| **Medium** | 50-200 | 4 cores | 8 GB | 200 GB | 500 Mbps |
| **Large** | 200-500 | 8 cores | 16 GB | 500 GB | 1 Gbps |
| **Enterprise** | 500+ | 16+ cores | 32+ GB | 1+ TB | 10 Gbps |

### Software

- **Operating System**: Linux (Ubuntu 22.04+ or equivalent)
- **Docker**: 24.0+ with Docker Compose 2.0+
- **Node.js**: 20.x LTS (if running without Docker)
- **PostgreSQL**: 15+ (included in Docker Compose)
- **Redis**: 7+ (included in Docker Compose)
- **Network**: Public IP address with ports 80/443 (HTTP/HTTPS) and 3478 (TURN) open

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/VisageDvachevsky/SyncWatchhhh.git
cd SyncWatchhhh
```

### 2. Copy Environment Files

```bash
# For production
cp .env.production.example .env.production

# For staging
cp .env.staging.example .env.staging
```

### 3. Configure Environment Variables

Edit `.env.production` and set required values:

```bash
# Database
DATABASE_URL="postgresql://syncwatch:CHANGE_ME@postgres:5432/syncwatch"

# Redis
REDIS_URL="redis://redis:6379"

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET="your-secure-random-secret-here"

# CORS (your frontend domain)
CORS_ORIGIN="https://yourdomain.com"

# MinIO (object storage)
MINIO_ROOT_USER="syncwatch"
MINIO_ROOT_PASSWORD="CHANGE_ME_STRONG_PASSWORD"

# TURN server
TURN_SECRET="your-turn-secret-here"

# Backend URL (for CORS and webhooks)
BACKEND_URL="https://api.yourdomain.com"

# Frontend URL
FRONTEND_URL="https://yourdomain.com"
```

### 4. Generate Secrets

```bash
# Generate strong secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For TURN_SECRET
openssl rand -base64 24  # For MINIO_ROOT_PASSWORD
openssl rand -base64 32  # For database password
```

### 5. Run Database Migrations

```bash
docker compose -f docker-compose.prod.yml run --rm backend npm run db:migrate
```

### 6. Start Services

```bash
# Production
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### 7. Access SyncWatch

- **Frontend**: https://yourdomain.com
- **Backend API**: https://api.yourdomain.com
- **Health Check**: https://api.yourdomain.com/health

---

## Resource Sizing

### Small Deployment (1-50 users)

**Use Case**: Personal, small team, testing

```yaml
# docker-compose.prod.yml overrides
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 1G

  redis:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

**Estimated Costs** (on cloud providers):
- AWS EC2 t3.small: ~$15/month
- Digital Ocean Droplet (2GB): ~$12/month
- Storage (50GB): ~$5/month

### Medium Deployment (50-200 users)

**Use Case**: Community, small business, startup

```yaml
services:
  backend:
    replicas: 2  # Load balanced
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G

  redis:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
```

**Estimated Costs**:
- AWS EC2 t3.medium: ~$30/month
- Load Balancer: ~$15/month
- Storage (200GB): ~$20/month

### Large Deployment (200-500 users)

**Use Case**: Enterprise, high traffic

- Multiple backend instances behind load balancer
- PostgreSQL with read replicas
- Redis Sentinel cluster for HA
- CDN for video delivery (CloudFront, Cloudflare)
- Separate TURN server(s)

**Architecture**:
```
Internet → Cloudflare CDN → Load Balancer
                              ↓
                    Backend (3+ instances)
                              ↓
                    PostgreSQL Primary + Replica
                              ↓
                    Redis Sentinel (3 nodes)
```

**Estimated Costs**: $200-500/month

---

## Configuration Reference

### Core Environment Variables

#### Database

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:port/database"

# Connection pool size (adjust based on load)
DB_POOL_MIN=2
DB_POOL_MAX=10
```

#### Redis

```bash
# Redis connection
REDIS_URL="redis://host:port"

# Redis for rate limiting (can be same as main Redis)
REDIS_RATE_LIMIT_URL="redis://host:port/1"

# Redis for state management (can be same as main Redis)
REDIS_STATE_URL="redis://host:port/2"
```

#### Security

```bash
# JWT secret (use strong random value)
JWT_SECRET="your-secret-here"

# JWT expiration times
JWT_EXPIRES_IN="15m"  # Access token
JWT_REFRESH_EXPIRES_IN="7d"  # Refresh token

# CORS allowed origins (comma-separated)
CORS_ORIGIN="https://yourdomain.com,https://www.yourdomain.com"

# Rate limiting
RATE_LIMIT_MAX=100  # Max requests per time window
RATE_LIMIT_WINDOW="1m"  # Time window
```

#### Object Storage (MinIO)

```bash
# MinIO credentials
MINIO_ROOT_USER="syncwatch"
MINIO_ROOT_PASSWORD="strong-password"
MINIO_ENDPOINT="minio:9000"
MINIO_BUCKET="syncwatch-videos"
MINIO_USE_SSL=false  # Set to true if using SSL

# Public URL for video access
MINIO_PUBLIC_URL="https://storage.yourdomain.com"
```

#### TURN Server

```bash
# TURN server configuration
TURN_SERVER_URL="turn:turn.yourdomain.com:3478"
TURN_SECRET="your-turn-secret"
TURN_TTL=86400  # Credential lifetime (24 hours)
```

#### Video Transcoding

```bash
# Transcoding queue
TRANSCODING_CONCURRENCY=2  # Max concurrent transcoding jobs
TRANSCODING_TIMEOUT=3600000  # 1 hour timeout per job

# Quality presets
TRANSCODING_QUALITIES="360p,480p,720p"
```

---

## Security Checklist

### Pre-Deployment

- [ ] **Change all default passwords** in `.env.production`
- [ ] **Generate strong random secrets** for JWT and TURN
- [ ] **Set CORS_ORIGIN** to your actual domain (never use `*`)
- [ ] **Enable HTTPS/TLS** on all services (use Let's Encrypt)
- [ ] **Set up firewall rules** (allow only 80, 443, 3478)
- [ ] **Disable PostgreSQL remote access** (only via localhost/Docker network)
- [ ] **Enable Redis password authentication**
- [ ] **Review environment variable files** for exposed secrets

### Post-Deployment

- [ ] **Test login/registration** with secure passwords
- [ ] **Verify HTTPS works** (no mixed content warnings)
- [ ] **Check CORS** (only allowed origins can access API)
- [ ] **Test rate limiting** (prevent brute force attacks)
- [ ] **Enable database backups** (automated daily backups)
- [ ] **Set up monitoring** (Prometheus + Grafana or cloud monitoring)
- [ ] **Configure log rotation** (prevent disk space exhaustion)
- [ ] **Test disaster recovery** (restore from backup)

### Ongoing

- [ ] **Update dependencies** monthly (security patches)
- [ ] **Monitor audit logs** for suspicious activity
- [ ] **Rotate secrets** annually (JWT, TURN, database passwords)
- [ ] **Review user access** quarterly (remove inactive users)
- [ ] **Test backups** quarterly (verify restore process)
- [ ] **Scan for vulnerabilities** (npm audit, Docker scan)

---

## Troubleshooting

### Backend Won't Start

**Symptom**: Backend container exits immediately

**Check**:
```bash
docker compose -f docker-compose.prod.yml logs backend
```

**Common Causes**:
1. **Database connection failed**
   - Verify `DATABASE_URL` is correct
   - Check if PostgreSQL is running: `docker compose ps`
   - Test connection: `docker compose exec postgres psql -U syncwatch`

2. **Redis connection failed**
   - Verify `REDIS_URL` is correct
   - Check if Redis is running: `docker compose exec redis redis-cli ping`

3. **Missing migrations**
   - Run migrations: `docker compose run --rm backend npm run db:migrate`

### Voice Chat Not Working

**Symptom**: Users can't hear each other

**Check**:
1. **TURN server status**
   ```bash
   docker compose logs turn
   ```

2. **TURN credentials**
   ```bash
   # Test TURN server with turnutils-uclient
   apt-get install coturn-utils
   turnutils-uclient -v turn.yourdomain.com
   ```

3. **Firewall rules**
   - Ensure port 3478 (UDP + TCP) is open
   - Check if TURN relay ports (49152-65535) are open

4. **Browser console**
   - Check for ICE connection failures
   - Verify microphone permissions granted

### Video Upload Fails

**Symptom**: Upload returns error or stalls

**Check**:
1. **MinIO status**
   ```bash
   docker compose logs minio
   curl -I http://localhost:9000/minio/health/live
   ```

2. **Disk space**
   ```bash
   df -h
   ```

3. **File size limits**
   - Default max: 500MB
   - Adjust in `.env.production`: `MAX_VIDEO_SIZE=1073741824` (1GB in bytes)

4. **Transcoding queue**
   ```bash
   # Check if transcoder is running
   docker compose logs transcoder

   # Inspect BullMQ queue
   docker compose exec redis redis-cli LLEN bull:transcoding:wait
   ```

### High CPU Usage

**Check**:
1. **Transcoding jobs**
   - Reduce concurrency: `TRANSCODING_CONCURRENCY=1`
   - Check queue depth: `docker compose exec redis redis-cli LLEN bull:transcoding:active`

2. **WebSocket connections**
   - Monitor active connections
   - Check for connection leaks

3. **Database queries**
   - Enable slow query logging
   - Add indexes for frequent queries

### Out of Memory

**Check**:
1. **Redis memory usage**
   ```bash
   docker compose exec redis redis-cli INFO memory
   ```
   - Set max memory: `maxmemory 1gb` in redis.conf
   - Set eviction policy: `maxmemory-policy allkeys-lru`

2. **Node.js heap size**
   ```bash
   # Increase heap size in docker-compose.yml
   environment:
     - NODE_OPTIONS=--max-old-space-size=2048
   ```

---

## Monitoring & Maintenance

### Health Checks

**Backend Health Endpoint**:
```bash
curl https://api.yourdomain.com/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-14T12:00:00.000Z",
  "uptime": 3600.5
}
```

### Database Backups

**Automated Backup (Daily)**:
```bash
# Add to crontab
0 2 * * * docker compose exec -T postgres pg_dump -U syncwatch syncwatch > /backups/syncwatch-$(date +\%Y\%m\%d).sql
```

**Manual Backup**:
```bash
docker compose exec postgres pg_dump -U syncwatch syncwatch > backup.sql
```

**Restore from Backup**:
```bash
docker compose exec -T postgres psql -U syncwatch syncwatch < backup.sql
```

### Log Rotation

**Configure logrotate** for Docker logs:
```bash
# /etc/logrotate.d/docker-syncwatch
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  missingok
  delaycompress
  copytruncate
}
```

### Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| CPU Usage | 70% | 90% |
| Memory Usage | 80% | 95% |
| Disk Usage | 75% | 90% |
| Redis Memory | 80% | 95% |
| Active WebSocket Connections | 1000 | 2000 |
| Database Connection Pool | 80% used | 100% used |
| Response Time (P95) | 500ms | 2000ms |

### Update Procedure

**Update SyncWatch**:
```bash
# 1. Backup database
docker compose exec postgres pg_dump -U syncwatch syncwatch > pre-update-backup.sql

# 2. Pull latest code
git pull origin main

# 3. Rebuild containers
docker compose -f docker-compose.prod.yml build

# 4. Run migrations
docker compose -f docker-compose.prod.yml run --rm backend npm run db:migrate

# 5. Restart services with zero-downtime
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend

# 6. Verify health
curl https://api.yourdomain.com/health
```

---

## Getting Help

- **Documentation**: See [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/VisageDvachevsky/SyncWatchhhh/issues)
- **Discussions**: [GitHub Discussions](https://github.com/VisageDvachevsky/SyncWatchhhh/discussions)

---

**Last Updated**: 2026-01-14
**Version**: 0.1.0
