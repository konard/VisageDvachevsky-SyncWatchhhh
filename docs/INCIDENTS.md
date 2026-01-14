# SyncWatch Incident Response Playbooks

This document provides incident response procedures for on-call engineers handling production incidents in SyncWatch.

## Table of Contents

1. [Incident Severity Levels](#incident-severity-levels)
2. [Escalation Procedures](#escalation-procedures)
3. [Incident Response Process](#incident-response-process)
4. [Playbook Index](#playbook-index)
5. [Playbooks](#playbooks)
6. [Post-Incident Review](#post-incident-review)

---

## Incident Severity Levels

| Level | Definition | Response Time | Examples | Notification |
|-------|------------|---------------|----------|--------------|
| **SEV1** | Complete outage affecting all users | **15 minutes** | Site down, database offline, complete data loss | Page all on-call engineers, notify management |
| **SEV2** | Major degradation affecting core functionality | **30 minutes** | Sync broken, uploads failing, authentication down | Page primary on-call, alert team |
| **SEV3** | Minor degradation, partial functionality affected | **2 hours** | Slow transcoding, intermittent errors, one region down | Alert primary on-call |
| **SEV4** | Cosmetic issues, no functional impact | **24 hours** | UI glitches, typos, minor performance degradation | Create ticket, handle during business hours |

---

## Escalation Procedures

### Escalation Chain

```
L1: On-Call Engineer (Primary)
  ↓ (if not resolved in 30min for SEV1, 1hr for SEV2)
L2: Senior On-Call Engineer
  ↓ (if not resolved in 1hr for SEV1, 2hr for SEV2)
L3: Engineering Manager
  ↓ (for SEV1 only, if not resolved in 2hr)
L4: CTO / VP Engineering
```

### When to Escalate

**Escalate immediately if:**
- Incident severity is SEV1 (complete outage)
- Data loss or security breach suspected
- Resolution time exceeds threshold
- External communication needed (customers, media)
- Unsure how to proceed

**How to Escalate:**
```bash
# PagerDuty
pd incident create --title "SEV1: Complete outage" --severity critical

# Slack
/incident escalate sev1

# Email
To: oncall-l2@syncwatch.com
Subject: [SEV1 ESCALATION] Complete outage - need assistance
```

---

## Incident Response Process

### 1. Acknowledge (< 5 minutes)

```bash
# Acknowledge alert
pd incident ack <incident-id>

# Join incident channel
# Slack: #incident-YYYYMMDD-001

# Post initial status
"Incident acknowledged. Investigating..."
```

### 2. Assess (< 10 minutes)

```bash
# Determine severity
# - How many users affected?
# - What functionality is impacted?
# - Is data at risk?

# Check monitoring
# - Grafana dashboards
# - Prometheus alerts
# - Error logs

# Communicate status
"SEV2: Authentication failing for ~50% of users. Investigating database connection issues."
```

### 3. Mitigate (ASAP)

```bash
# Primary goal: Restore service
# Secondary goal: Root cause analysis (can wait)

# Common mitigation steps:
# - Rollback recent deployment
# - Scale up resources
# - Failover to backup
# - Enable maintenance mode

# Document actions taken
"Rolled back backend to v1.2.3. Service restored. Investigating root cause."
```

### 4. Communicate

```bash
# Update status every 15-30 minutes
"Update: Service restored. Users can login again. Monitoring for stability."

# External communication (for SEV1/SEV2)
# Status page: https://status.syncwatch.com
"We are experiencing issues with authentication. The team is working on a fix. ETA: 30 minutes."
```

### 5. Resolve

```bash
# Verify service is stable
# - All alerts cleared
# - Metrics back to normal
# - No errors in logs

# Close incident
pd incident resolve <incident-id>

# Final update
"Incident resolved. Root cause: database connection pool exhaustion. Fix: increased pool size from 10 to 20. Monitoring for 24h."
```

### 6. Post-Mortem

Within 48 hours of SEV1/SEV2 incidents, write a post-mortem (see [Post-Incident Review](#post-incident-review)).

---

## Playbook Index

1. [Complete Site Outage (SEV1)](#playbook-1-complete-site-outage-sev1)
2. [Database Unavailable (SEV1)](#playbook-2-database-unavailable-sev1)
3. [Redis Failure (SEV2)](#playbook-3-redis-failure-sev2)
4. [High Playback Drift (SEV2)](#playbook-4-high-playback-drift-sev2)
5. [Authentication Failures (SEV2)](#playbook-5-authentication-failures-sev2)
6. [Transcoding Jobs Stuck (SEV3)](#playbook-6-transcoding-jobs-stuck-sev3)
7. [High Error Rate (SEV2)](#playbook-7-high-error-rate-sev2)
8. [Disk Space Full (SEV2)](#playbook-8-disk-space-full-sev2)
9. [Memory Leak (SEV3)](#playbook-9-memory-leak-sev3)
10. [WebSocket Connection Failures (SEV2)](#playbook-10-websocket-connection-failures-sev2)

---

## Playbooks

### Playbook 1: Complete Site Outage (SEV1)

**Symptoms:**
- Site unreachable (HTTP 502/503/504)
- All health checks failing
- Users reporting "site is down"

**Alert:**
```
FIRING: SiteDown
  severity: critical
  summary: SyncWatch is completely unavailable
```

**Investigation Steps:**

1. **Check load balancer:**
   ```bash
   # AWS ALB
   aws elbv2 describe-target-health --target-group-arn <arn>

   # Expected: At least 1 healthy target
   # If all unhealthy, backends are down
   ```

2. **Check backend services:**
   ```bash
   kubectl get pods -n syncwatch-production
   # Are pods running? Check STATUS and READY columns

   docker compose -f docker-compose.prod.yml ps
   # Are containers up?
   ```

3. **Check recent deployments:**
   ```bash
   kubectl rollout history deployment/syncwatch-backend
   # Was there a recent deployment?
   ```

**Resolution:**

**If recent deployment (< 30 min ago):**
```bash
# Rollback immediately
kubectl rollout undo deployment/syncwatch-backend -n syncwatch-production
kubectl rollout undo deployment/syncwatch-frontend -n syncwatch-production

# Monitor recovery
kubectl rollout status deployment/syncwatch-backend
```

**If pods are crashing:**
```bash
# Check logs
kubectl logs -n syncwatch-production deployment/syncwatch-backend --tail=100

# Common issues:
# - Database connection failed → check DATABASE_URL
# - Out of memory → scale up resources
# - Startup crash → check environment variables
```

**If load balancer issue:**
```bash
# Check target group health
# Verify security groups allow traffic
# Restart load balancer if needed
```

**Communication Template:**
```
Status Page Update:

Title: Complete Service Outage
Status: Investigating / Identified / Monitoring / Resolved
Impact: All users unable to access SyncWatch
Update: We are investigating a complete service outage. The engineering team has been notified and is working on a resolution. ETA: 30 minutes.
```

---

### Playbook 2: Database Unavailable (SEV1)

**Symptoms:**
- API returns 500 errors
- Error logs: "Connection to database failed"
- Health check shows `database: disconnected`

**Alert:**
```
FIRING: DatabaseDown
  severity: critical
  summary: PostgreSQL database is unreachable
```

**Investigation Steps:**

1. **Check database status:**
   ```bash
   # AWS RDS
   aws rds describe-db-instances --db-instance-identifier syncwatch-production
   # Check Status field

   # Direct connection test
   psql -h db.example.com -U syncwatch -c "SELECT 1;"
   ```

2. **Check connection limits:**
   ```bash
   # Check active connections
   psql -h db.example.com -U syncwatch -c "
     SELECT count(*) FROM pg_stat_activity;
   "

   # Check max connections
   psql -h db.example.com -U syncwatch -c "
     SHOW max_connections;
   "
   ```

3. **Check network/firewall:**
   ```bash
   # Can backend reach database?
   kubectl exec -it deployment/syncwatch-backend -- ping db.example.com
   kubectl exec -it deployment/syncwatch-backend -- telnet db.example.com 5432
   ```

**Resolution:**

**If database is down:**
```bash
# AWS RDS: Reboot
aws rds reboot-db-instance --db-instance-identifier syncwatch-production

# Wait for reboot (2-5 minutes)
aws rds wait db-instance-available --db-instance-identifier syncwatch-production

# Verify health
psql -h db.example.com -U syncwatch -c "SELECT 1;"
```

**If connection pool exhausted:**
```bash
# Kill idle connections
psql -h db.example.com -U syncwatch -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '10 minutes';
"

# Increase connection pool size (environment variable)
# Update MAX_CONNECTIONS or adjust Prisma connection pool
```

**If failover needed:**
```bash
# Promote read replica to master (AWS RDS Multi-AZ)
aws rds failover-db-cluster --db-cluster-identifier syncwatch-production

# Update DATABASE_URL to point to new master
# Restart backend services
```

---

### Playbook 3: Redis Failure (SEV2)

**Symptoms:**
- Sync commands not working
- Rooms not updating
- Error logs: "Redis connection failed"

**Alert:**
```
FIRING: RedisDown
  severity: high
  summary: Redis cache is unreachable
```

**Investigation Steps:**

1. **Check Redis status:**
   ```bash
   redis-cli -h redis.example.com -a <password> PING
   # Expected: PONG
   ```

2. **Check memory:**
   ```bash
   redis-cli -h redis.example.com -a <password> INFO memory
   # Check used_memory_human and maxmemory_human
   ```

**Resolution:**

**If Redis is down:**
```bash
# AWS ElastiCache: Reboot
aws elasticache reboot-cache-cluster \
  --cache-cluster-id syncwatch-production \
  --cache-node-ids-to-reboot 001

# Self-hosted: Restart
kubectl rollout restart statefulset/redis
# or
docker restart syncwatch_redis_1
```

**If memory full:**
```bash
# Clear all data (use with caution!)
redis-cli -h redis.example.com -a <password> FLUSHDB

# Or scale up Redis instance
aws elasticache modify-cache-cluster \
  --cache-cluster-id syncwatch-production \
  --cache-node-type cache.m6g.large
```

**If failover to replica:**
```bash
# AWS ElastiCache automatically fails over
# Manually trigger:
aws elasticache test-failover \
  --replication-group-id syncwatch-production \
  --node-group-id 0001
```

**Temporary Workaround:**
- Disable sync features (fallback to individual playback)
- Room state will not persist across restarts

---

### Playbook 4: High Playback Drift (SEV2)

**Symptoms:**
- Users report video out of sync
- Alert: HighPlaybackDrift firing
- Metrics show drift > 300ms

**Investigation Steps:**

1. **Check sync command latency:**
   ```bash
   # Query Prometheus
   curl 'http://prometheus:9090/api/v1/query?query=syncwatch_sync_command_latency_ms{quantile="0.95"}'

   # Should be < 100ms
   ```

2. **Check Redis latency:**
   ```bash
   redis-cli -h redis.example.com -a <password> --latency
   # Should be < 1ms
   ```

3. **Check WebSocket connection health:**
   ```bash
   kubectl logs deployment/syncwatch-backend | grep "client disconnected" | wc -l
   # High disconnect rate = network issues
   ```

**Resolution:**

**If Redis latency high:**
```bash
# Check for slow commands
redis-cli -h redis.example.com -a <password> SLOWLOG GET 10

# Scale Redis or optimize queries
```

**If WebSocket issues:**
```bash
# Check load balancer timeout settings
# Ensure timeout > WS_PING_INTERVAL (default 25s)

# AWS ALB: Update idle timeout
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <arn> \
  --attributes Key=idle_timeout.timeout_seconds,Value=60
```

**If backend overloaded:**
```bash
# Scale up backend
kubectl scale deployment syncwatch-backend --replicas=5
```

---

### Playbook 5: Authentication Failures (SEV2)

**Symptoms:**
- Login/register requests fail (401/500)
- "Invalid credentials" for valid users
- JWT token validation fails

**Investigation Steps:**

1. **Check error logs:**
   ```bash
   kubectl logs deployment/syncwatch-backend | grep -i "auth\|jwt\|login"
   ```

2. **Test authentication manually:**
   ```bash
   # Register new user
   curl -X POST https://api.syncwatch.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","username":"test","password":"Test123!"}'

   # Login
   curl -X POST https://api.syncwatch.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}'
   ```

3. **Check database:**
   ```bash
   # Can backend connect to DB?
   psql -h db.example.com -U syncwatch -c "SELECT COUNT(*) FROM \"User\";"
   ```

**Resolution:**

**If JWT_SECRET changed/missing:**
```bash
# Verify environment variable is set
kubectl exec deployment/syncwatch-backend -- printenv | grep JWT_SECRET

# If missing, add to secrets
kubectl create secret generic syncwatch-secrets \
  --from-literal=jwt-secret="..." \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend
kubectl rollout restart deployment/syncwatch-backend
```

**If database issue:**
- See [Playbook 2: Database Unavailable](#playbook-2-database-unavailable-sev1)

**If bcrypt hashing fails:**
```bash
# Check logs for bcrypt errors
# May indicate memory pressure or bcrypt cost too high
# Temporary fix: scale up backend resources
```

---

### Playbook 6: Transcoding Jobs Stuck (SEV3)

**Symptoms:**
- Alert: TranscodingBacklog firing
- Queue depth > 10 for > 10 minutes
- Users report uploads not processing

**Investigation Steps:**

1. **Check queue depth:**
   ```bash
   redis-cli -h redis.example.com -a <password> LLEN transcoding:queue
   ```

2. **Check transcoder health:**
   ```bash
   kubectl get pods -l app=syncwatch-transcoder
   kubectl logs deployment/syncwatch-transcoder --tail=50
   ```

3. **Check for stuck FFmpeg processes:**
   ```bash
   kubectl exec -it deployment/syncwatch-transcoder -- ps aux | grep ffmpeg
   ```

**Resolution:**

**If transcoder pod crashed:**
```bash
kubectl rollout restart deployment/syncwatch-transcoder
```

**If FFmpeg process stuck:**
```bash
# Kill stuck processes
kubectl exec -it deployment/syncwatch-transcoder -- pkill -9 ffmpeg

# Transcoder worker should auto-restart jobs
```

**If disk full:**
```bash
# Check disk space
kubectl exec -it deployment/syncwatch-transcoder -- df -h

# Clean up temp files
kubectl exec -it deployment/syncwatch-transcoder -- rm -rf /tmp/transcoding/*

# Scale up storage if needed
```

**If too many jobs:**
```bash
# Scale up transcoder workers
kubectl scale deployment syncwatch-transcoder --replicas=3

# Or clear queue (last resort)
redis-cli -h redis.example.com -a <password> DEL transcoding:queue
```

---

### Playbook 7: High Error Rate (SEV2)

**Symptoms:**
- Alert: HighErrorRate firing
- 5xx errors > 1% of requests
- Users reporting various errors

**Investigation Steps:**

1. **Check error rate by endpoint:**
   ```bash
   # Prometheus query
   curl 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])'
   ```

2. **Check recent errors:**
   ```bash
   kubectl logs deployment/syncwatch-backend --tail=100 | grep ERROR
   ```

3. **Check recent deployments:**
   ```bash
   kubectl rollout history deployment/syncwatch-backend
   ```

**Resolution:**

**If caused by recent deployment:**
```bash
# Rollback
kubectl rollout undo deployment/syncwatch-backend
```

**If specific endpoint failing:**
```bash
# Identify endpoint from logs
# Check for:
# - Database query issues
# - External API failures
# - Resource exhaustion

# Temporary fix: Disable problematic feature
# Or scale up resources
```

**If uncaught exceptions:**
```bash
# Check logs for stack traces
# Deploy hotfix with try/catch
# Or rollback to last known good version
```

---

### Playbook 8: Disk Space Full (SEV2)

**Symptoms:**
- Alert: DiskSpaceLow / DiskSpaceFull firing
- Write operations fail
- Logs: "No space left on device"

**Investigation Steps:**

1. **Check disk usage:**
   ```bash
   kubectl exec -it deployment/syncwatch-backend -- df -h

   # Identify full partition
   ```

2. **Find large files:**
   ```bash
   kubectl exec -it deployment/syncwatch-backend -- du -sh /* | sort -hr | head -10
   ```

**Resolution:**

**Clean up logs:**
```bash
# Truncate log files
kubectl exec -it deployment/syncwatch-backend -- sh -c "truncate -s 0 /var/log/*.log"

# Or configure log rotation
```

**Clean up videos:**
```bash
# Force cleanup of expired videos
kubectl exec -it deployment/syncwatch-backend -- node scripts/cleanup-expired-videos.js
```

**Clean up Docker:**
```bash
# Prune unused images/containers
docker system prune -a --volumes -f

# This frees up significant space
```

**Scale up storage:**
```bash
# AWS EBS: Resize volume
aws ec2 modify-volume --volume-id vol-xxx --size 100

# Kubernetes: Resize PVC
kubectl patch pvc storage-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

---

### Playbook 9: Memory Leak (SEV3)

**Symptoms:**
- Memory usage steadily increasing
- OOMKilled pod restarts
- Slow performance, high GC activity

**Investigation Steps:**

1. **Check memory usage:**
   ```bash
   kubectl top pods -n syncwatch-production
   ```

2. **Check for memory leaks:**
   ```bash
   # Take heap dump
   kubectl exec -it deployment/syncwatch-backend -- node --expose-gc --inspect=0.0.0.0:9229 &

   # Use Chrome DevTools to analyze heap
   chrome://inspect
   ```

3. **Review recent code changes:**
   - Event listeners not removed?
   - Global variables growing?
   - Caching without limits?

**Resolution:**

**Short-term (restart):**
```bash
kubectl rollout restart deployment/syncwatch-backend
```

**Medium-term (increase memory):**
```bash
# Update deployment with higher memory limits
kubectl set resources deployment syncwatch-backend \
  --limits=memory=4Gi \
  --requests=memory=2Gi
```

**Long-term (fix leak):**
```bash
# Identify leak in heap dump
# Deploy fix
# Monitor memory usage over 24h
```

---

### Playbook 10: WebSocket Connection Failures (SEV2)

**Symptoms:**
- Users can't join rooms
- "WebSocket connection failed" errors
- Disconnect/reconnect loops

**Investigation Steps:**

1. **Check WebSocket health:**
   ```bash
   # Test connection
   wscat -c wss://api.syncwatch.com/sync

   # Should connect successfully
   ```

2. **Check logs:**
   ```bash
   kubectl logs deployment/syncwatch-backend | grep -i websocket
   ```

3. **Check load balancer:**
   ```bash
   # Verify WebSocket support enabled
   # Check idle timeout (should be > 30s)
   ```

**Resolution:**

**If load balancer timeout:**
```bash
# AWS ALB: Increase idle timeout
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <arn> \
  --attributes Key=idle_timeout.timeout_seconds,Value=60
```

**If backend overloaded:**
```bash
kubectl scale deployment syncwatch-backend --replicas=5
```

**If CORS issues:**
```bash
# Verify CORS_ORIGIN includes frontend URL
kubectl exec deployment/syncwatch-backend -- printenv CORS_ORIGIN
```

---

## Post-Incident Review

### Post-Mortem Template

Create a document with the following sections:

```markdown
# Incident Post-Mortem: [Title]

**Date**: 2025-01-14
**Duration**: 45 minutes (14:30 - 15:15 UTC)
**Severity**: SEV2
**Impact**: ~1000 users unable to join rooms
**Incident Commander**: Jane Doe

## Summary

Brief description of what happened.

## Timeline

- **14:30** - Alert fired: WebSocketConnectionFailures
- **14:32** - On-call engineer acknowledged
- **14:35** - Identified load balancer timeout issue
- **14:40** - Increased ALB idle timeout from 30s to 60s
- **14:45** - Connections restored, monitoring
- **15:15** - Incident resolved, all metrics normal

## Root Cause

Load balancer idle timeout (30s) was lower than WebSocket ping interval (25s), causing connections to be terminated during normal operation.

## Impact

- ~1000 active users experienced WebSocket disconnections
- Unable to join or participate in rooms
- Duration: 45 minutes

## Resolution

Increased AWS ALB idle timeout from 30s to 60s.

## Preventive Actions

- [ ] Update IaC to set ALB timeout to 60s by default
- [ ] Add monitoring alert for WebSocket disconnect rate
- [ ] Document WebSocket requirements in deployment guide
- [ ] Add integration test for WebSocket connection stability

## Lessons Learned

**What went well:**
- Fast detection (<2 minutes)
- Clear runbook guidance
- Quick resolution

**What went wrong:**
- Load balancer timeout not configured correctly from start
- No monitoring for WebSocket-specific issues

**Where we got lucky:**
- Low user count at time of incident
- Issue was straightforward to diagnose

## Action Items

| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| Update Terraform config | DevOps | 2025-01-15 | ✅ Done |
| Add WS monitoring | SRE | 2025-01-20 | 🔄 In Progress |
| Update docs | Engineering | 2025-01-18 | ⏳ Pending |
```

---

For troubleshooting guides, see [RUNBOOKS.md](RUNBOOKS.md).
For day-to-day operations, see [OPERATIONS.md](OPERATIONS.md).
