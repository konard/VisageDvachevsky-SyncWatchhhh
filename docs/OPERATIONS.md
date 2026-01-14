# SyncWatch Operations Guide

This document provides day-to-day operational procedures for on-call engineers managing the SyncWatch production environment.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Operations](#weekly-operations)
3. [Monthly Operations](#monthly-operations)
4. [Monitoring Dashboards](#monitoring-dashboards)
5. [Log Analysis](#log-analysis)
6. [Performance Benchmarks](#performance-benchmarks)
7. [Backup & Restore](#backup--restore)
8. [Scaling Operations](#scaling-operations)
9. [Security Operations](#security-operations)
10. [Common Tasks](#common-tasks)

---

## Daily Operations

### Morning Health Checks (15 minutes)

Run these checks every morning to ensure system health.

#### 1. Service Health

```bash
# Check all services are healthy
curl https://api.syncwatch.com/health/ready

# Expected response:
# {
#   "status": "ready",
#   "checks": {
#     "database": "connected",
#     "redis": "connected",
#     "storage": "accessible"
#   }
# }

# Check specific services (Kubernetes)
kubectl get pods -n syncwatch-production
# All pods should show STATUS: Running, READY: 1/1

# Check Docker Compose
docker compose -f docker-compose.prod.yml ps
# All services should show STATE: Up
```

**❌ If any service is unhealthy:**
- Check logs: `kubectl logs <pod-name>` or `docker logs <container-name>`
- Restart if needed: `kubectl rollout restart deployment/<name>`
- If persistent, escalate to incident (see [INCIDENTS.md](INCIDENTS.md))

#### 2. Prometheus Alerts

```bash
# Check for firing alerts
curl http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# Common alerts to review:
# - HighPlaybackDrift
# - TranscodingBacklog
# - DatabaseConnectionPoolFull
# - RedisMemoryHigh
```

**❌ If alerts are firing:**
- Review alert details in Prometheus UI
- Follow runbook for specific alert (see [RUNBOOKS.md](RUNBOOKS.md))

#### 3. Error Rates

```bash
# Check error rates in Grafana or via Prometheus
# HTTP 5xx errors should be < 0.1%

# Query Prometheus
curl 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])'

# Check application logs for errors
kubectl logs -n syncwatch-production deployment/syncwatch-backend \
  --tail=100 | grep -i error
```

**Acceptable Thresholds:**
- 5xx errors: < 0.1%
- 4xx errors: < 5%
- API latency p95: < 500ms
- API latency p99: < 1000ms

#### 4. Resource Usage

```bash
# Check resource utilization
kubectl top nodes
kubectl top pods -n syncwatch-production

# Disk usage
df -h

# Memory should be < 80%
# CPU should be < 70%
# Disk should be < 80%
```

**⚠️ If resources exceed threshold:**
- Scale up services (see [Scaling Operations](#scaling-operations))
- Clean up old data (videos, logs)

#### 5. Transcoding Queue

```bash
# Check queue depth
redis-cli -h redis.syncwatch.com -a <password> LLEN transcoding:queue

# Should be < 5 pending jobs
# If > 10 for > 10 minutes, check transcoder health
```

### Evening Checks (5 minutes)

```bash
# 1. Verify backups completed
aws s3 ls s3://syncwatch-backups/$(date +%Y-%m-%d)/

# 2. Check for any new alerts
curl http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# 3. Review today's error logs
# Should see summary in log aggregation tool (CloudWatch, Datadog)
```

---

## Weekly Operations

### Monday: Capacity Planning (30 minutes)

```bash
# 1. Review weekly metrics
# - Active users
# - Video uploads
# - Storage growth
# - Bandwidth usage

# 2. Project next week's needs
# - Will storage reach threshold?
# - Need to scale services?

# 3. Check for upcoming traffic spikes
# - Marketing campaigns
# - Holidays
```

**Action Items:**
- [ ] Scale infrastructure if needed
- [ ] Extend storage if < 20% free space
- [ ] Review budget vs actual costs

### Tuesday: Security Review (20 minutes)

```bash
# 1. Review access logs for anomalies
aws logs filter-log-events \
  --log-group-name /aws/ecs/syncwatch-backend \
  --filter-pattern "[ip, method, path, status=401 || status=403]" \
  --start-time $(date -d '7 days ago' +%s)000

# 2. Check for failed login attempts
# High number of 401s from same IP = possible brute force

# 3. Rotate TURN credentials
# See Security Operations below

# 4. Check for CVEs in dependencies
npm audit --production
# or
snyk test
```

**Action Items:**
- [ ] Block suspicious IPs in WAF/firewall
- [ ] Update dependencies with security patches
- [ ] Rotate credentials if needed

### Wednesday: Backup Verification (15 minutes)

```bash
# 1. List recent backups
aws rds describe-db-snapshots \
  --db-instance-identifier syncwatch-production \
  --snapshot-type automated \
  --max-records 7

# 2. Test restore (staging environment)
# Restore latest backup to staging
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier syncwatch-staging-restore \
  --db-snapshot-identifier <latest-snapshot>

# 3. Verify data integrity
# Connect to restored DB and run sanity checks
psql -h restored-db.example.com -U syncwatch -c "SELECT COUNT(*) FROM users;"
```

**Action Items:**
- [ ] Confirm automated backups are running
- [ ] Test restore procedure monthly
- [ ] Update backup retention if needed

### Thursday: Performance Review (30 minutes)

```bash
# 1. Review weekly performance metrics in Grafana
# - API latency trends
# - Sync drift over time
# - Transcoding durations
# - WebSocket connection stability

# 2. Identify slow queries
# Check database slow query log
aws rds download-db-log-file-portion \
  --db-instance-identifier syncwatch-production \
  --log-file-name slowquery/postgresql.log

# 3. Review CDN cache hit rate
# Should be > 80%
```

**Action Items:**
- [ ] Optimize slow queries
- [ ] Adjust CDN cache rules if hit rate low
- [ ] Scale services if latency increasing

### Friday: Cleanup & Maintenance (20 minutes)

```bash
# 1. Delete expired videos
# Automatic cleanup job should handle this
# Verify it ran successfully
kubectl logs -n syncwatch-production cronjob/video-cleanup --tail=100

# 2. Clean up old logs
# Retain last 30 days, archive rest
aws logs delete-log-stream \
  --log-group-name /aws/ecs/syncwatch-backend \
  --log-stream-name <old-stream>

# 3. Prune unused Docker images
docker image prune -a --filter "until=168h"

# 4. Check database vacuum stats
psql -h db.example.com -U syncwatch -c "
  SELECT schemaname, tablename, last_vacuum, last_autovacuum
  FROM pg_stat_user_tables
  ORDER BY last_autovacuum NULLS FIRST;
"
```

**Action Items:**
- [ ] Verify cleanup jobs succeeded
- [ ] Free up disk space
- [ ] Database maintenance if needed

---

## Monthly Operations

### First Monday: Disaster Recovery Drill (1 hour)

```bash
# 1. Simulate database failure and restore
# 2. Simulate Redis failure and recovery
# 3. Verify monitoring alerts correctly
# 4. Document issues found
```

### Second Monday: Dependency Updates (2 hours)

```bash
# 1. Update Node.js dependencies
npm outdated
npm update

# 2. Test in staging
npm run build && npm run test

# 3. Deploy to production during maintenance window
```

### Third Monday: Cost Optimization (1 hour)

```bash
# 1. Review AWS Cost Explorer
# - Identify largest cost centers
# - Look for unused resources

# 2. Optimize storage
# - Delete old transcoded variants
# - Move infrequently accessed data to Glacier

# 3. Right-size instances
# - Check CPU/memory utilization
# - Downgrade over-provisioned instances
```

### Last Monday: Security Audit (2 hours)

```bash
# 1. Review IAM permissions
# - Remove unused roles
# - Enforce least privilege

# 2. Rotate secrets
# - Database passwords
# - API keys
# - JWT secret (during maintenance)

# 3. Update firewall rules
# - Review security group rules
# - Remove unnecessary open ports
```

---

## Monitoring Dashboards

### Grafana Dashboards

**Dashboard: SyncWatch Overview**
- URL: `https://grafana.syncwatch.com/d/overview`
- Panels:
  - Active users (last 24h)
  - Request rate
  - Error rate
  - API latency (p50, p95, p99)
  - Active rooms
  - Video uploads

**Dashboard: Infrastructure Health**
- URL: `https://grafana.syncwatch.com/d/infrastructure`
- Panels:
  - CPU usage per service
  - Memory usage per service
  - Disk I/O
  - Network I/O
  - Database connections
  - Redis memory

**Dashboard: Video & Sync**
- URL: `https://grafana.syncwatch.com/d/video-sync`
- Panels:
  - Sync drift distribution
  - Transcoding queue depth
  - Transcoding duration
  - HLS segment delivery time
  - WebSocket connection count

### Key Metrics to Watch

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API p95 latency | < 500ms | Warning at 500ms, Critical at 1000ms |
| Sync drift | < 300ms | Warning at 300ms, Critical at 500ms |
| Database connections | < 80% pool | Warning at 80%, Critical at 95% |
| Redis memory | < 80% max | Warning at 80%, Critical at 90% |
| Disk usage | < 80% | Warning at 80%, Critical at 90% |
| Error rate | < 0.1% | Warning at 0.1%, Critical at 1% |
| Transcoding queue | < 5 jobs | Warning at 10, Critical at 20 |

---

## Log Analysis

### Log Locations

**Kubernetes:**
```bash
# Backend logs
kubectl logs -n syncwatch-production deployment/syncwatch-backend --tail=100 -f

# Frontend logs
kubectl logs -n syncwatch-production deployment/syncwatch-frontend --tail=100 -f

# Transcoder logs
kubectl logs -n syncwatch-production deployment/syncwatch-transcoder --tail=100 -f
```

**Docker Compose:**
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
```

**CloudWatch (AWS):**
```bash
# Tail logs
aws logs tail /aws/ecs/syncwatch-backend --follow

# Filter errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/syncwatch-backend \
  --filter-pattern "ERROR"
```

### Common Log Queries

**Find errors in last hour:**
```bash
kubectl logs deployment/syncwatch-backend --since=1h | grep -i error
```

**Find slow API requests (> 1s):**
```bash
kubectl logs deployment/syncwatch-backend --since=1h | grep "request_duration" | awk '$NF > 1000'
```

**WebSocket disconnections:**
```bash
kubectl logs deployment/syncwatch-backend | grep "client disconnected"
```

**Failed authentications:**
```bash
kubectl logs deployment/syncwatch-backend | grep -E "(401|Unauthorized)"
```

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Acceptable |
|--------|--------|------------|
| API latency (p50) | < 100ms | < 200ms |
| API latency (p95) | < 300ms | < 500ms |
| API latency (p99) | < 500ms | < 1000ms |
| Sync drift | < 100ms | < 300ms |
| WebSocket latency | < 50ms | < 100ms |
| Transcoding (1080p, 1hr) | < 5 min | < 10 min |
| Database query (p95) | < 10ms | < 50ms |
| Redis operation (p95) | < 1ms | < 5ms |

### Running Benchmarks

**API Load Test:**
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API health endpoint
ab -n 10000 -c 100 -k https://api.syncwatch.com/health

# Expected:
# - Requests per second: > 1000
# - Time per request (mean): < 100ms
# - Failed requests: 0
```

**WebSocket Load Test:**
```bash
# Using artillery
npm install -g artillery

# Create load-test.yaml
cat > load-test.yaml <<EOF
config:
  target: "wss://api.syncwatch.com"
  phases:
    - duration: 60
      arrivalRate: 10
  engines:
    socketio:
      namespace: /sync

scenarios:
  - engine: socketio
    flow:
      - emit:
          channel: "room:join"
          data:
            roomCode: "TEST1234"
            guestName: "LoadTest"
      - think: 5
      - emit:
          channel: "sync:play"
          data:
            sequenceNumber: 1
EOF

# Run test
artillery run load-test.yaml
```

---

## Backup & Restore

### Automated Backups

**PostgreSQL (RDS):**
- Automated daily snapshots (retained 7 days)
- Transaction logs backed up every 5 minutes
- Cross-region replication enabled

**Redis:**
- AOF enabled (fsync every second)
- RDB snapshot every 6 hours
- Replicated to standby node

**S3 Videos:**
- Versioning enabled
- Lifecycle policy: Delete after 72 hours
- No backup needed (source of truth)

### Manual Backup

```bash
# Database backup
pg_dump -h db.example.com -U syncwatch -Fc syncwatch > syncwatch_$(date +%Y%m%d).dump

# Upload to S3
aws s3 cp syncwatch_$(date +%Y%m%d).dump s3://syncwatch-backups/manual/

# Redis backup
redis-cli -h redis.example.com -a <password> BGSAVE
```

### Restore Procedure

**From RDS Snapshot:**
```bash
# 1. List snapshots
aws rds describe-db-snapshots --db-instance-identifier syncwatch-production

# 2. Restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier syncwatch-production-restored \
  --db-snapshot-identifier <snapshot-id>

# 3. Update DATABASE_URL in environment
# 4. Restart backend services
```

**From Manual Backup:**
```bash
# 1. Download backup
aws s3 cp s3://syncwatch-backups/manual/syncwatch_20250114.dump .

# 2. Restore
pg_restore -h db.example.com -U syncwatch -d syncwatch -c syncwatch_20250114.dump

# 3. Verify
psql -h db.example.com -U syncwatch -c "SELECT COUNT(*) FROM users;"
```

---

## Scaling Operations

### Horizontal Scaling

**Kubernetes:**
```bash
# Scale backend
kubectl scale deployment syncwatch-backend --replicas=5 -n syncwatch-production

# Scale transcoder
kubectl scale deployment syncwatch-transcoder --replicas=3 -n syncwatch-production

# Auto-scaling (HPA)
kubectl autoscale deployment syncwatch-backend \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n syncwatch-production
```

**Docker Compose:**
```bash
# Edit docker-compose.prod.yml
# Change replicas under deploy section
docker compose -f docker-compose.prod.yml up -d --scale backend=5
```

### Vertical Scaling

**Database:**
```bash
# Modify instance class
aws rds modify-db-instance \
  --db-instance-identifier syncwatch-production \
  --db-instance-class db.t3.large \
  --apply-immediately
```

**Redis:**
```bash
# Modify cache node type
aws elasticache modify-cache-cluster \
  --cache-cluster-id syncwatch-production \
  --cache-node-type cache.m6g.large \
  --apply-immediately
```

---

## Security Operations

### Rotate TURN Credentials

```bash
# Generate new secret
NEW_TURN_SECRET=$(openssl rand -base64 32)

# Update TURN server config
# Update backend environment: TURN_SECRET=$NEW_TURN_SECRET

# Restart backend to pick up new secret
kubectl rollout restart deployment/syncwatch-backend -n syncwatch-production
```

### Rotate Database Password

```bash
# 1. Create new password
NEW_DB_PASS=$(openssl rand -base64 32)

# 2. Update password in database
aws rds modify-db-instance \
  --db-instance-identifier syncwatch-production \
  --master-user-password "$NEW_DB_PASS"

# 3. Update secret
kubectl create secret generic syncwatch-secrets \
  --from-literal=database-url="postgresql://user:$NEW_DB_PASS@..." \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Restart services
kubectl rollout restart deployment/syncwatch-backend -n syncwatch-production
```

### Block Malicious IP

```bash
# AWS WAF
aws wafv2 create-ip-set \
  --scope REGIONAL \
  --name syncwatch-blocklist \
  --ip-address-version IPV4 \
  --addresses 203.0.113.0/24

# Update WAF rule to block IP set
```

---

## Common Tasks

### Restart Services

```bash
# Kubernetes
kubectl rollout restart deployment/syncwatch-backend -n syncwatch-production

# Docker Compose
docker compose -f docker-compose.prod.yml restart backend
```

### View Active Rooms

```bash
# Redis CLI
redis-cli -h redis.example.com -a <password>

# List all room keys
KEYS room:*:playback

# Get room participants
SMEMBERS room:ABC12345:participants
```

### Clear Transcoding Queue

```bash
# If queue is stuck, clear it
redis-cli -h redis.example.com -a <password> DEL transcoding:queue

# Restart transcoder
kubectl rollout restart deployment/syncwatch-transcoder
```

### Force User Logout

```bash
# Delete user's refresh tokens
psql -h db.example.com -U syncwatch -c "
  DELETE FROM \"RefreshToken\"
  WHERE \"userId\" = 'user_id_here';
"
```

---

For incident response procedures, see [INCIDENTS.md](INCIDENTS.md).
For troubleshooting guides, see [RUNBOOKS.md](RUNBOOKS.md).
