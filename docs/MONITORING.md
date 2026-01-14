# Monitoring and Health Checks

This document describes the monitoring, health checks, and resource limits implemented in SyncWatch.

## Health Check Endpoints

All services expose health check endpoints for Kubernetes probes and monitoring.

### Backend API

#### GET /health/live
**Liveness probe** - Returns 200 if the process is running.

```bash
curl http://localhost:4000/health/live
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T03:00:00.000Z"
}
```

#### GET /health/ready
**Readiness probe** - Returns 200 only if the service can accept traffic.

Checks:
- PostgreSQL connectivity
- Redis connectivity
- MinIO connectivity

```bash
curl http://localhost:4000/health/ready
```

Response (healthy):
```json
{
  "status": "ok",
  "timestamp": "2026-01-14T03:00:00.000Z",
  "checks": {
    "postgres": {
      "healthy": true,
      "latencyMs": 5
    },
    "redis": {
      "healthy": true,
      "latencyMs": 2
    },
    "minio": {
      "healthy": true,
      "latencyMs": 10
    }
  }
}
```

Response (degraded - returns 503):
```json
{
  "status": "degraded",
  "timestamp": "2026-01-14T03:00:00.000Z",
  "checks": {
    "postgres": {
      "healthy": true,
      "latencyMs": 5
    },
    "redis": {
      "healthy": false,
      "error": "Connection refused"
    },
    "minio": {
      "healthy": true,
      "latencyMs": 10
    }
  }
}
```

### Transcoder Worker

The transcoder worker runs a separate HTTP server on port 3001 for health checks.

#### GET /health/live
Liveness probe - returns 200 if process is running.

```bash
curl http://localhost:3001/health/live
```

#### GET /health/ready
Readiness probe - checks if worker can process jobs.

```bash
curl http://localhost:3001/health/ready
```

#### GET /health/transcoder
Detailed transcoder status including queue metrics.

```bash
curl http://localhost:3001/health/transcoder
```

Response:
```json
{
  "healthy": true,
  "activeJobs": 1,
  "queueDepth": 3,
  "ffmpegAvailable": true,
  "cpuUsagePercent": 45.2,
  "memoryUsageMB": 1024,
  "lastJobCompletedAt": "2026-01-14T02:55:00.000Z",
  "lastJobFailedAt": null
}
```

## Resource Limits

All containers have explicit resource limits to prevent runaway processes.

### Production Limits (docker-compose.prod.yml)

| Service | CPU Limit | Memory Limit | Notes |
|---------|-----------|--------------|-------|
| Backend | 2 cores | 2 GB | API and WebSocket server |
| Transcoder | 4 cores | 8 GB | FFmpeg is CPU intensive |
| Frontend | 0.5 cores | 256 MB | Static files only |
| Redis | 1 core | 1 GB | maxmemory=800MB |
| PostgreSQL | 2 cores | 4 GB | Connection limit: 200 |
| MinIO | 1 core | 2 GB | Object storage |
| Prometheus | 1 core | 1 GB | Metrics storage |
| Grafana | 0.5 cores | 512 MB | Dashboards |

### Redis Configuration

Redis is configured with memory limits and eviction policy:

```yaml
command: redis-server --maxmemory 800mb --maxmemory-policy allkeys-lru
```

- **maxmemory**: 800MB (leaving headroom within 1GB container limit)
- **policy**: allkeys-lru (evict least recently used keys when memory is full)

### PostgreSQL Configuration

PostgreSQL is configured with connection pool limits:

```yaml
command: >
  postgres
    -c max_connections=200
    -c shared_buffers=1GB
    -c effective_cache_size=3GB
    -c maintenance_work_mem=256MB
```

### FFmpeg Process Limits

FFmpeg processes are monitored and killed if they exceed resource limits:

```typescript
{
  maxMemoryMB: 4096,            // Kill if exceeds 4GB RAM
  timeoutMinutes: 120,          // Max 2 hours per job
  niceLevel: 10,                // Lower priority
  progressTimeoutMs: 120000     // Kill if stuck for 2 minutes
}
```

The FFmpeg watchdog monitors:
- **Memory usage**: Kills process if it exceeds 4GB
- **Total timeout**: Kills process after 2 hours
- **Progress timeout**: Kills process if no progress for 2 minutes
- **Process priority**: Sets nice level to 10 (lower priority)

## Prometheus Metrics

Prometheus scrapes metrics from all services on `/metrics` endpoints.

### Scrape Configuration

See `config/prometheus.yml` for the complete configuration.

Jobs:
- **backend**: API metrics (port 4000)
- **transcoder**: Worker metrics (port 3001)
- **postgres**: Database metrics (via postgres-exporter)
- **redis**: Cache metrics (via redis-exporter)
- **node**: System metrics (via node-exporter)
- **cadvisor**: Container metrics

### Key Metrics

#### Backend API
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `websocket_connections_active` - Active WebSocket connections
- `websocket_connections_total` - Total WebSocket connection events

#### Transcoder
- `transcoder_queue_depth` - Number of pending jobs
- `transcoder_active_jobs` - Number of currently processing jobs
- `transcoder_job_duration_seconds` - Job processing time histogram
- `transcoder_job_failures_total` - Total failed jobs

#### System
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `process_open_fds` - Open file descriptors

## Alerting Rules

See `config/alerts.yml` for all alert definitions.

### Critical Alerts

| Alert | Threshold | Duration | Description |
|-------|-----------|----------|-------------|
| ServiceDown | up == 0 | 1m | Service is not responding |
| PostgreSQLDown | up{job="postgres"} == 0 | 1m | Database is down |
| RedisDown | up{job="redis"} == 0 | 1m | Cache is down |

### Warning Alerts

| Alert | Threshold | Duration | Description |
|-------|-----------|----------|-------------|
| HighCPUUsage | CPU > 80% | 5m | High CPU usage |
| HighMemoryUsage | Memory > 1.5GB | 5m | High memory usage |
| HighAPILatency | p95 > 500ms | 5m | Slow API responses |
| HighErrorRate | 5xx > 1% | 5m | High error rate |
| HighFFmpegQueueDepth | Queue > 10 | 10m | Too many pending jobs |
| HighWebSocketChurn | Churn > 10/min | 5m | Frequent connection changes |

## Grafana Dashboards

Grafana is pre-configured with dashboards for monitoring SyncWatch.

### SyncWatch Overview Dashboard

Panels:
1. **API Request Rate** - Requests per second by endpoint
2. **API Latency (p95)** - 95th percentile response time
3. **Error Rate** - Percentage of 5xx responses
4. **WebSocket Connections** - Active connections over time
5. **FFmpeg Queue Depth** - Pending and active transcoding jobs
6. **CPU Usage by Service** - CPU usage per container
7. **Memory Usage by Service** - Memory usage per container
8. **Database Connections** - Active PostgreSQL connections

### Accessing Grafana

Development:
```bash
# Access Grafana at http://localhost:3000
# Default credentials (change in production):
# Username: admin
# Password: (set via GRAFANA_ADMIN_PASSWORD env var)
```

Production:
- Configure via reverse proxy (nginx)
- Set strong admin password
- Enable authentication

## Docker Health Checks

All services have Docker health checks configured:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:4000/health/live"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Timeout after 10 seconds
  retries: 3         # Retry 3 times before marking unhealthy
  start_period: 40s  # Grace period on container start
```

Health check statuses:
- **healthy**: All checks passing
- **unhealthy**: Checks failing after retries
- **starting**: Within start_period grace period

View health status:
```bash
docker ps
# Look for "(healthy)" or "(unhealthy)" in STATUS column

# Get detailed health status
docker inspect --format='{{.State.Health.Status}}' syncwatch-backend
```

## Kubernetes Integration

The health check endpoints are designed for Kubernetes probes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: syncwatch-backend
spec:
  containers:
  - name: backend
    image: syncwatch-backend:latest
    livenessProbe:
      httpGet:
        path: /health/live
        port: 4000
      initialDelaySeconds: 40
      periodSeconds: 30
      timeoutSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 4000
      initialDelaySeconds: 20
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

## Troubleshooting

### Service Not Ready

If `/health/ready` returns 503:

1. Check which dependency is failing:
   ```bash
   curl http://localhost:4000/health/ready | jq '.checks'
   ```

2. Check dependency logs:
   ```bash
   docker logs syncwatch-db        # PostgreSQL
   docker logs syncwatch-redis     # Redis
   docker logs syncwatch-minio     # MinIO
   ```

3. Verify dependencies are running:
   ```bash
   docker ps | grep syncwatch
   ```

### High Resource Usage

If alerts fire for high CPU/memory:

1. Check container stats:
   ```bash
   docker stats
   ```

2. View Grafana dashboards for detailed metrics

3. Check logs for errors:
   ```bash
   docker logs syncwatch-backend --tail 100
   docker logs syncwatch-transcoder --tail 100
   ```

### FFmpeg Jobs Stuck

If FFmpeg jobs are not completing:

1. Check transcoder health:
   ```bash
   curl http://localhost:3001/health/transcoder
   ```

2. Check queue depth and active jobs

3. Review transcoder logs:
   ```bash
   docker logs syncwatch-transcoder --tail 100
   ```

4. The FFmpeg watchdog will automatically kill stuck processes after 2 minutes without progress

## Production Deployment

### Prerequisites

1. Set environment variables in `.env`:
   ```bash
   # Database
   POSTGRES_USER=syncwatch
   POSTGRES_PASSWORD=<strong-password>
   DATABASE_URL=postgresql://syncwatch:<password>@db:5432/syncwatch

   # MinIO
   MINIO_ROOT_USER=syncwatch
   MINIO_ROOT_PASSWORD=<strong-password>

   # JWT
   JWT_SECRET=<random-secret-256-bits>
   JWT_REFRESH_SECRET=<random-secret-256-bits>

   # TURN
   TURN_SECRET=<random-secret>

   # Grafana
   GRAFANA_ADMIN_PASSWORD=<strong-password>

   # App
   VERSION=v1.0.0
   CORS_ORIGIN=https://syncwatch.example.com
   TURN_SERVER_URL=turn:turn.syncwatch.example.com:3478
   ```

2. Start services:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. Verify all services are healthy:
   ```bash
   docker ps
   curl http://localhost:4000/health/ready
   curl http://localhost:3001/health/ready
   ```

4. Access monitoring:
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000

### Monitoring Checklist

- [ ] All services show "(healthy)" status
- [ ] Prometheus targets are UP
- [ ] Grafana dashboards loading correctly
- [ ] Alerts configured and tested
- [ ] Logs aggregation configured (if using external service)
- [ ] Backup monitoring for critical alerts

## References

- Technical Specification: [Section 8.6 - Enhanced Health Checks](./TECHNICAL_SPECIFICATION.md#86-enhanced-health-checks)
- Technical Specification: [Section 8.7 - Resource Limits](./TECHNICAL_SPECIFICATION.md#87-resource-limits)
- Prometheus Documentation: https://prometheus.io/docs/
- Grafana Documentation: https://grafana.com/docs/
