# SyncWatch Troubleshooting Runbooks

This document provides detailed troubleshooting guides for common issues in SyncWatch. For incident response playbooks, see [INCIDENTS.md](INCIDENTS.md).

## Table of Contents

1. [Sync Issues](#sync-issues)
2. [WebRTC Connection Problems](#webrtc-connection-problems)
3. [Transcoding Failures](#transcoding-failures)
4. [Performance Issues](#performance-issues)
5. [Database Issues](#database-issues)
6. [Redis Issues](#redis-issues)
7. [Authentication Issues](#authentication-issues)
8. [File Upload Issues](#file-upload-issues)
9. [Network & Connectivity](#network--connectivity)
10. [Deployment Issues](#deployment-issues)

---

## Sync Issues

### Problem: Video Playback Out of Sync

**Symptoms:**
- Users report videos not synchronized
- Drift > 300ms between participants
- Sync commands delayed or not applied

**Diagnostic Steps:**

1. **Check sync command latency:**
   ```bash
   # Prometheus query
   curl 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(syncwatch_sync_command_latency_ms_bucket[5m]))'

   # Should be < 100ms
   ```

2. **Check Redis latency:**
   ```bash
   redis-cli -h redis.example.com -a <password> --latency

   # Expected output (latency in ms):
   # min: 0, max: 1, avg: 0.50 (samples)
   ```

3. **Check WebSocket connection quality:**
   ```bash
   kubectl logs deployment/syncwatch-backend --tail=100 | grep "sync:command"

   # Look for patterns:
   # - High rate of disconnects
   # - Slow command processing
   ```

4. **Check server time sync:**
   ```bash
   # On backend servers
   kubectl exec -it deployment/syncwatch-backend -- date +%s%3N

   # Compare with actual time
   # Drift should be < 100ms
   ```

**Solutions:**

**If Redis latency high (> 5ms):**
```bash
# Check Redis memory usage
redis-cli -h redis.example.com -a <password> INFO memory

# If used_memory > 80% of maxmemory:
# 1. Scale up Redis instance
aws elasticache modify-cache-cluster \
  --cache-cluster-id syncwatch-production \
  --cache-node-type cache.m6g.large

# 2. Or clear old room data
redis-cli -h redis.example.com -a <password> \
  --scan --pattern "room:*" | \
  xargs redis-cli -h redis.example.com -a <password> DEL
```

**If WebSocket latency high:**
```bash
# Scale up backend
kubectl scale deployment syncwatch-backend --replicas=5

# Check load balancer settings
# - Verify WebSocket support enabled
# - Ensure idle timeout > WS_PING_INTERVAL (default 25s)
```

**If clock drift (NTP issue):**
```bash
# Check NTP sync status
kubectl exec -it deployment/syncwatch-backend -- timedatectl status

# If not synced:
# 1. Install NTP client
# 2. Configure NTP servers
# 3. Restart NTP service
```

**If client-side issue:**
```bash
# Request browser console logs from affected users
# Look for:
# - JavaScript errors
# - WebSocket reconnection loops
# - Sync command processing errors

# Common client fixes:
# - Clear browser cache
# - Disable browser extensions
# - Update browser version
```

---

## WebRTC Connection Problems

### Problem: Voice Chat Not Working

**Symptoms:**
- Can't hear other participants
- Microphone not detected
- Connection stuck in "connecting" state

**Diagnostic Steps:**

1. **Check browser console (user-side):**
   ```javascript
   // Look for errors like:
   // - NotAllowedError: Permission denied
   // - OverconstrainedError: No device found
   // - ICE connection failed
   ```

2. **Check WebRTC logs (backend):**
   ```bash
   kubectl logs deployment/syncwatch-backend | grep -i "webrtc\|ice\|stun\|turn"
   ```

3. **Test STUN/TURN server:**
   ```bash
   # Using Trickle ICE test
   curl https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

   # Or command-line test
   stunclient stun.syncwatch.com 3478
   ```

4. **Check NAT type:**
   ```bash
   # Users behind symmetric NAT need TURN server
   # Test NAT type: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   ```

**Solutions:**

**If microphone permission denied:**
```
User must:
1. Allow microphone access in browser
2. Check system microphone permissions (macOS/Windows)
3. Verify microphone is not in use by another app
```

**If STUN server unreachable:**
```bash
# Verify STUN server configuration
# Default: stun:stun.l.google.com:19302

# Add fallback STUN servers in frontend config:
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};
```

**If TURN server needed (symmetric NAT):**
```bash
# Deploy coturn TURN server
# See docs/TECHNICAL_SPECIFICATION.md section 4.3.3

# Update TURN credentials
# Generate time-limited credentials:
username=$(date +%s)
password=$(echo -n "$username" | openssl dgst -sha1 -hmac "$TURN_SECRET" -binary | base64)

# Configure in backend environment:
TURN_SERVER_URL="turn:turn.syncwatch.com:3478"
TURN_SECRET="your_turn_secret"
```

**If ICE connection fails:**
```bash
# Common causes:
# 1. Firewall blocking UDP (ports 10000-60000)
#    → Open firewall or use TURN with TCP
# 2. Corporate proxy blocking WebRTC
#    → User must use personal network
# 3. Browser bug
#    → Update browser or try different browser
```

**If echo/audio quality issues:**
```javascript
// Enable echo cancellation in getUserMedia
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};
```

---

## Transcoding Failures

### Problem: Video Upload Stuck or Fails

**Symptoms:**
- Video status stuck at "processing"
- Transcoding progress at 0% for > 5 minutes
- Error: "Transcoding failed"

**Diagnostic Steps:**

1. **Check video status in database:**
   ```bash
   psql -h db.example.com -U syncwatch -c "
     SELECT id, filename, status, progress, \"errorMessage\"
     FROM \"Video\"
     WHERE status IN ('processing', 'failed')
     ORDER BY \"createdAt\" DESC
     LIMIT 10;
   "
   ```

2. **Check transcoder logs:**
   ```bash
   kubectl logs deployment/syncwatch-transcoder --tail=100

   # Look for FFmpeg errors
   ```

3. **Check disk space:**
   ```bash
   kubectl exec -it deployment/syncwatch-transcoder -- df -h

   # /tmp should have enough space for video + transcoded output
   ```

4. **Check FFmpeg process:**
   ```bash
   kubectl exec -it deployment/syncwatch-transcoder -- ps aux | grep ffmpeg

   # If stuck (same PID for > 10 min), it's hung
   ```

**Solutions:**

**If FFmpeg hung:**
```bash
# Kill stuck process
kubectl exec -it deployment/syncwatch-transcoder -- pkill -9 ffmpeg

# Transcoder worker should auto-retry
```

**If disk space full:**
```bash
# Clean up temp files
kubectl exec -it deployment/syncwatch-transcoder -- rm -rf /tmp/transcoding/*

# Increase storage
kubectl patch pvc transcoder-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

**If video format unsupported:**
```bash
# Check error message in database
# Common issues:
# - Corrupted video file
# - Unsupported codec
# - DRM-protected content

# Solution: Return user-friendly error
# Update video record:
psql -h db.example.com -U syncwatch -c "
  UPDATE \"Video\"
  SET status = 'failed',
      \"errorMessage\" = 'Unsupported video format'
  WHERE id = '<video-id>';
"
```

**If transcoding too slow:**
```bash
# Check transcoder CPU usage
kubectl top pod -l app=syncwatch-transcoder

# If CPU < 50%, increase CPU allocation
kubectl set resources deployment syncwatch-transcoder \
  --limits=cpu=8,memory=16Gi \
  --requests=cpu=4,memory=8Gi

# Or scale horizontally
kubectl scale deployment syncwatch-transcoder --replicas=3
```

**If MinIO/S3 upload fails:**
```bash
# Check MinIO logs
kubectl logs deployment/minio

# Verify credentials
kubectl exec -it deployment/syncwatch-transcoder -- \
  env | grep MINIO

# Test upload
kubectl exec -it deployment/syncwatch-transcoder -- \
  aws s3 cp /tmp/test.txt s3://syncwatch-videos/test.txt
```

---

## Performance Issues

### Problem: High API Latency

**Symptoms:**
- API requests slow (p95 > 500ms)
- Users report sluggish UI
- Timeouts

**Diagnostic Steps:**

1. **Check API latency metrics:**
   ```bash
   # Prometheus query
   curl 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_ms_bucket[5m]))'
   ```

2. **Identify slow endpoints:**
   ```bash
   kubectl logs deployment/syncwatch-backend | \
     grep "request_duration" | \
     awk '$NF > 500' | \
     awk '{print $3}' | \
     sort | uniq -c | sort -rn | head -10
   ```

3. **Check database query performance:**
   ```bash
   # Enable slow query log
   psql -h db.example.com -U syncwatch -c "
     ALTER SYSTEM SET log_min_duration_statement = 100;
   "

   # View slow queries
   psql -h db.example.com -U syncwatch -c "
     SELECT query, calls, total_time, mean_time
     FROM pg_stat_statements
     ORDER BY mean_time DESC
     LIMIT 10;
   "
   ```

4. **Check resource utilization:**
   ```bash
   kubectl top nodes
   kubectl top pods -n syncwatch-production
   ```

**Solutions:**

**If database queries slow:**
```bash
# Add missing indexes
# Example: Index on frequently queried fields
psql -h db.example.com -U syncwatch -c "
  CREATE INDEX CONCURRENTLY idx_videos_uploader_status
  ON \"Video\" (\"uploaderId\", status);
"

# Analyze query plans
psql -h db.example.com -U syncwatch -c "
  EXPLAIN ANALYZE
  SELECT * FROM \"User\" WHERE email = 'test@example.com';
"

# Vacuum and analyze
psql -h db.example.com -U syncwatch -c "VACUUM ANALYZE;"
```

**If CPU bottleneck:**
```bash
# Scale horizontally
kubectl scale deployment syncwatch-backend --replicas=5

# Or vertically (increase CPU)
kubectl set resources deployment syncwatch-backend \
  --limits=cpu=4,memory=8Gi \
  --requests=cpu=2,memory=4Gi
```

**If memory pressure:**
```bash
# Check for memory leaks
kubectl logs deployment/syncwatch-backend | grep "out of memory"

# Restart to clear memory
kubectl rollout restart deployment/syncwatch-backend

# Increase memory limits
kubectl set resources deployment syncwatch-backend \
  --limits=memory=8Gi \
  --requests=memory=4Gi
```

**If network latency:**
```bash
# Check inter-service latency
kubectl exec -it deployment/syncwatch-backend -- ping db.example.com
kubectl exec -it deployment/syncwatch-backend -- ping redis.example.com

# If high (> 10ms), services may be in different AZs
# Consider:
# - Using same-AZ deployment
# - Caching to reduce DB calls
```

---

## Database Issues

### Problem: Connection Pool Exhausted

**Symptoms:**
- Error: "Too many connections"
- API requests fail with 500 errors
- Health check shows database disconnected

**Diagnostic Steps:**

1. **Check active connections:**
   ```bash
   psql -h db.example.com -U syncwatch -c "
     SELECT count(*) AS active_connections,
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections
     FROM pg_stat_activity;
   "
   ```

2. **List connections by state:**
   ```bash
   psql -h db.example.com -U syncwatch -c "
     SELECT state, count(*)
     FROM pg_stat_activity
     GROUP BY state;
   "
   ```

3. **Find long-running queries:**
   ```bash
   psql -h db.example.com -U syncwatch -c "
     SELECT pid, state, query_start, query
     FROM pg_stat_activity
     WHERE state != 'idle'
       AND query_start < NOW() - INTERVAL '5 minutes'
     ORDER BY query_start;
   "
   ```

**Solutions:**

**Terminate idle connections:**
```bash
psql -h db.example.com -U syncwatch -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '10 minutes';
"
```

**Kill long-running queries:**
```bash
psql -h db.example.com -U syncwatch -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE query_start < NOW() - INTERVAL '10 minutes'
    AND state != 'idle';
"
```

**Increase max connections:**
```bash
# AWS RDS: Modify parameter group
aws rds modify-db-parameter-group \
  --db-parameter-group-name syncwatch-params \
  --parameters "ParameterName=max_connections,ParameterValue=200,ApplyMethod=immediate"

# Reboot required
aws rds reboot-db-instance --db-instance-identifier syncwatch-production
```

**Optimize Prisma connection pool:**
```javascript
// backend/src/common/utils/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Limit pool size
  connectionLimit: 10,
});
```

---

## Redis Issues

### Problem: Redis Memory Full

**Symptoms:**
- Error: "OOM command not allowed"
- Cannot create new rooms
- Sync state not updating

**Diagnostic Steps:**

1. **Check memory usage:**
   ```bash
   redis-cli -h redis.example.com -a <password> INFO memory

   # Look at:
   # - used_memory_human
   # - maxmemory_human
   # - mem_fragmentation_ratio
   ```

2. **Check key count:**
   ```bash
   redis-cli -h redis.example.com -a <password> DBSIZE
   ```

3. **Find large keys:**
   ```bash
   redis-cli -h redis.example.com -a <password> \
     --bigkeys --bigkeys-args 100
   ```

**Solutions:**

**Clear expired keys:**
```bash
# Manually trigger active expiration
redis-cli -h redis.example.com -a <password> \
  --scan --pattern "room:*" | \
  while read key; do
    ttl=$(redis-cli -h redis.example.com -a <password> TTL "$key")
    if [ "$ttl" -le 0 ]; then
      redis-cli -h redis.example.com -a <password> DEL "$key"
    fi
  done
```

**Scale up Redis:**
```bash
# AWS ElastiCache
aws elasticache modify-cache-cluster \
  --cache-cluster-id syncwatch-production \
  --cache-node-type cache.m6g.large \
  --apply-immediately
```

**Configure eviction policy:**
```bash
# Set eviction policy to remove least recently used keys
redis-cli -h redis.example.com -a <password> \
  CONFIG SET maxmemory-policy allkeys-lru

# Or in redis.conf:
maxmemory-policy allkeys-lru
```

---

## Authentication Issues

### Problem: Users Can't Login

**Symptoms:**
- Login returns 401 Unauthorized
- "Invalid credentials" for correct password
- JWT token validation fails

**Diagnostic Steps:**

1. **Test authentication manually:**
   ```bash
   # Login
   curl -X POST https://api.syncwatch.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}' \
     -v

   # Check response status and body
   ```

2. **Check user exists:**
   ```bash
   psql -h db.example.com -U syncwatch -c "
     SELECT id, email, username
     FROM \"User\"
     WHERE email = 'test@example.com';
   "
   ```

3. **Check JWT_SECRET:**
   ```bash
   kubectl exec deployment/syncwatch-backend -- printenv JWT_SECRET

   # Ensure it's set and hasn't changed recently
   ```

**Solutions:**

**If password hash mismatch:**
```bash
# Reset user password
node -e "
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('NewPassword123!', 10);
  console.log(hash);
"

# Update in database
psql -h db.example.com -U syncwatch -c "
  UPDATE \"User\"
  SET \"passwordHash\" = '<new-hash>'
  WHERE email = 'test@example.com';
"
```

**If JWT_SECRET missing/changed:**
```bash
# If changed, all existing tokens are invalid
# Users must re-login

# Set secret
kubectl create secret generic syncwatch-secrets \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend
kubectl rollout restart deployment/syncwatch-backend
```

---

## File Upload Issues

### Problem: Video Upload Fails

**Symptoms:**
- Upload stuck at 0%
- Error: "Upload failed"
- File size exceeded

**Diagnostic Steps:**

1. **Check file size:**
   ```bash
   # Max upload size (8GB default)
   echo $MAX_UPLOAD_SIZE
   ```

2. **Check MinIO/S3 access:**
   ```bash
   # Test upload
   aws s3 cp test.txt s3://syncwatch-videos/test.txt

   # If fails, check credentials
   aws s3 ls s3://syncwatch-videos/
   ```

3. **Check nginx/LB max body size:**
   ```bash
   # nginx.conf
   client_max_body_size 8192M;

   # AWS ALB: No limit by default
   ```

**Solutions:**

**If file too large:**
```bash
# Increase limit (environment variable)
MAX_UPLOAD_SIZE=10737418240  # 10GB

# Update in Kubernetes secret or .env
```

**If MinIO credentials invalid:**
```bash
# Update credentials
kubectl create secret generic syncwatch-secrets \
  --from-literal=minio-access-key="..." \
  --from-literal=minio-secret-key="..." \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend
kubectl rollout restart deployment/syncwatch-backend
```

**If nginx rejects large files:**
```bash
# Update nginx config
client_max_body_size 10240M;

# Reload nginx
kubectl rollout restart deployment/syncwatch-frontend
```

---

## Network & Connectivity

### Problem: Cannot Reach Backend API

**Symptoms:**
- Frontend can't connect to backend
- CORS errors
- Connection timeout

**Diagnostic Steps:**

1. **Test backend health:**
   ```bash
   curl -v https://api.syncwatch.com/health

   # Should return 200 OK
   ```

2. **Check CORS headers:**
   ```bash
   curl -v https://api.syncwatch.com/health \
     -H "Origin: https://syncwatch.com"

   # Should include:
   # Access-Control-Allow-Origin: https://syncwatch.com
   ```

3. **Check DNS resolution:**
   ```bash
   dig api.syncwatch.com

   # Should resolve to load balancer IP
   ```

4. **Check load balancer health:**
   ```bash
   # AWS ALB
   aws elbv2 describe-target-health --target-group-arn <arn>

   # All targets should be "healthy"
   ```

**Solutions:**

**If CORS error:**
```bash
# Verify CORS_ORIGIN includes frontend URL
kubectl exec deployment/syncwatch-backend -- printenv CORS_ORIGIN

# Update if needed
kubectl create secret generic syncwatch-secrets \
  --from-literal=cors-origin="https://syncwatch.com" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart
kubectl rollout restart deployment/syncwatch-backend
```

**If DNS issue:**
```bash
# Check DNS records
dig api.syncwatch.com

# Update DNS if needed (point to LB)
```

**If load balancer unhealthy:**
```bash
# Check target group
aws elbv2 describe-target-health --target-group-arn <arn>

# If all unhealthy, backends are down
# Check pod status
kubectl get pods -n syncwatch-production
```

---

## Deployment Issues

### Problem: Deployment Fails

**Symptoms:**
- `kubectl apply` fails
- Pods in CrashLoopBackOff
- ImagePullBackOff

**Diagnostic Steps:**

1. **Check pod status:**
   ```bash
   kubectl get pods -n syncwatch-production
   kubectl describe pod <pod-name>
   ```

2. **Check logs:**
   ```bash
   kubectl logs <pod-name> --previous
   ```

3. **Check events:**
   ```bash
   kubectl get events -n syncwatch-production --sort-by='.lastTimestamp'
   ```

**Solutions:**

**If ImagePullBackOff:**
```bash
# Image doesn't exist or registry auth failed
# Verify image exists
docker pull syncwatch/backend:v1.0.0

# Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password>

# Reference in deployment
spec:
  imagePullSecrets:
  - name: regcred
```

**If CrashLoopBackOff:**
```bash
# App crashes on startup
# Check logs for error
kubectl logs <pod-name> --previous

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

**If OOMKilled:**
```bash
# Pod ran out of memory
# Increase memory limits
kubectl set resources deployment syncwatch-backend \
  --limits=memory=4Gi \
  --requests=memory=2Gi
```

---

For incident response procedures, see [INCIDENTS.md](INCIDENTS.md).
For daily operations, see [OPERATIONS.md](OPERATIONS.md).
