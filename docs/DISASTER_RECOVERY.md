# Disaster Recovery Plan

This document provides comprehensive disaster recovery procedures for SyncWatch production infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [Recovery Time Objectives (RTO)](#recovery-time-objectives-rto)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Procedures](#recovery-procedures)
5. [Runbooks](#runbooks)
6. [Testing & Validation](#testing--validation)
7. [Contact Information](#contact-information)

## Overview

### Backup Strategy

| Component | Backup Type | Frequency | Retention | Storage |
|-----------|-------------|-----------|-----------|---------|
| PostgreSQL | Full + WAL | Daily | 30 days | S3 (Standard-IA) |
| Redis | RDB Snapshot | Hourly | 7 days | S3 (Standard-IA) |
| MinIO | Cross-region replication | Continuous | Indefinite | Secondary region |
| Config | Git | On change | Indefinite | GitHub |

### Recovery Objectives

| Service | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---------|------------------------------|--------------------------------|
| Application Server | 15-30 minutes | < 1 minute |
| PostgreSQL | 15-30 minutes | < 24 hours |
| Redis | 5-10 minutes | < 1 hour |
| MinIO (Video Storage) | 1-4 hours | Real-time (replicated) |
| TURN Server | 5 minutes | N/A (stateless) |

## Recovery Time Objectives (RTO)

### Critical Services (RTO < 30 minutes)
- Application server (Backend + Frontend)
- Redis cache
- PostgreSQL database

### Important Services (RTO < 4 hours)
- MinIO object storage
- Transcoder workers

### Best Effort (RTO < 24 hours)
- Analytics
- Monitoring dashboards

## Disaster Scenarios

### 1. Redis Failure

**Detection:**
- Health check failures (`/health` endpoint)
- Connection errors in application logs
- Increased latency or timeouts

**Impact:**
- Room state synchronization disrupted
- Session management failures
- Temporary loss of real-time features

**Recovery Procedure:** [See Redis Recovery](#redis-recovery)

### 2. PostgreSQL Failure

**Detection:**
- Database connection errors
- Failed Prisma queries
- Health check failures

**Impact:**
- Unable to create/join rooms
- User authentication failures
- Data loss if not backed up

**Recovery Procedure:** [See PostgreSQL Recovery](#postgresql-recovery)

### 3. MinIO Segment Loss

**Detection:**
- 404 errors on video playback
- MinIO API errors in transcoder logs
- Missing object alerts

**Impact:**
- Video playback failures for specific content
- Transcoding job failures

**Recovery Procedure:** [See MinIO Recovery](#minio-recovery)

### 4. TURN Server Unavailability

**Detection:**
- WebRTC ICE connection failures
- Voice chat connection issues
- Client-side ICE gathering errors

**Impact:**
- Voice chat fails for users behind NAT/firewalls
- Degraded WebRTC connectivity

**Recovery Procedure:** [See TURN Recovery](#turn-recovery)

### 5. Complete Region Outage

**Detection:**
- All services unavailable in primary region
- Cloud provider status page confirms outage
- Monitoring alerts from external probes

**Impact:**
- Complete service outage
- All users unable to access application

**Recovery Procedure:** [See Region Failover](#region-failover)

### 6. Application Server Failure

**Detection:**
- HTTP 5xx errors
- Container/pod crashes
- Health check failures

**Impact:**
- API unavailable
- WebSocket disconnections
- Service degradation

**Recovery Procedure:** [See Application Recovery](#application-recovery)

## Recovery Procedures

### Redis Recovery

**Scenario:** Redis instance fails or becomes corrupted

**Steps:**

1. **Assess the situation:**
   ```bash
   redis-cli -h <redis-host> ping
   redis-cli -h <redis-host> INFO replication
   ```

2. **Attempt automatic failover (if using Redis Sentinel/Cluster):**
   ```bash
   redis-cli -h <sentinel-host> -p 26379 SENTINEL failover mymaster
   ```

3. **Manual failover to replica:**
   ```bash
   # On replica
   redis-cli SLAVEOF NO ONE

   # Update application to point to new master
   kubectl set env deployment/syncwatch-backend REDIS_HOST=<new-redis-host>
   ```

4. **Restore from backup (if no replica):**
   ```bash
   # Stop Redis
   sudo systemctl stop redis

   # Download latest backup
   aws s3 cp s3://syncwatch-backups/redis/redis_latest.rdb /var/lib/redis/dump.rdb

   # Set permissions
   chown redis:redis /var/lib/redis/dump.rdb

   # Start Redis
   sudo systemctl start redis
   ```

5. **Verify recovery:**
   ```bash
   redis-cli ping
   redis-cli GET test-key
   ```

6. **Monitor application:**
   ```bash
   kubectl logs -f deployment/syncwatch-backend | grep -i redis
   ```

**Expected Recovery Time:** 5-10 minutes

### PostgreSQL Recovery

**Scenario:** PostgreSQL database corruption or data loss

**Steps:**

1. **Assess the situation:**
   ```bash
   psql -h <db-host> -U syncwatch -d syncwatch -c "SELECT 1;"
   psql -h <db-host> -U syncwatch -d postgres -c "SELECT pg_database_size('syncwatch');"
   ```

2. **Attempt replica promotion (if using replication):**
   ```bash
   # On replica
   pg_ctl promote -D /var/lib/postgresql/14/main

   # Update application connection string
   kubectl set env deployment/syncwatch-backend DATABASE_URL=<new-db-url>
   ```

3. **Restore from latest backup:**
   ```bash
   # Download latest backup
   ./scripts/backup/restore-postgres.sh s3://syncwatch-backups/postgres/syncwatch_latest.dump
   ```

4. **Point-in-Time Recovery (if WAL archiving enabled):**
   ```bash
   # Stop PostgreSQL
   sudo systemctl stop postgresql

   # Restore base backup
   cd /var/lib/postgresql/14/main
   rm -rf *
   tar -xzf /backups/base_backup.tar.gz

   # Configure recovery
   cat > recovery.conf <<EOF
   restore_command = 'aws s3 cp s3://syncwatch-backups/postgres/wal/%f %p'
   recovery_target_time = '2024-01-14 12:00:00'
   EOF

   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

5. **Run migrations:**
   ```bash
   cd backend
   npm run db:migrate:deploy
   ```

6. **Verify recovery:**
   ```bash
   psql -h <db-host> -U syncwatch -d syncwatch -c "\dt"
   psql -h <db-host> -U syncwatch -d syncwatch -c "SELECT COUNT(*) FROM users;"
   ```

**Expected Recovery Time:** 15-30 minutes

### MinIO Recovery

**Scenario:** Video segment loss or corruption

**Steps:**

1. **Check replication status:**
   ```bash
   mc replicate status minio/videos
   ```

2. **Restore from secondary region:**
   ```bash
   # Sync from backup region
   mc mirror backup-minio/videos minio/videos --overwrite
   ```

3. **Re-transcode missing videos (if no backup):**
   ```bash
   # Identify missing videos
   aws s3 ls s3://syncwatch-videos/ --recursive > current_videos.txt

   # Re-queue transcoding jobs
   psql -h <db-host> -U syncwatch -d syncwatch <<EOF
   SELECT id, filename FROM videos
   WHERE storage_path NOT IN (SELECT path FROM current_videos);
   EOF
   ```

4. **Verify recovery:**
   ```bash
   # Test video playback
   curl -I https://cdn.syncwatch.example.com/videos/segment.m3u8
   ```

**Expected Recovery Time:** 1-4 hours (depending on data size)

### TURN Recovery

**Scenario:** TURN server becomes unavailable

**Steps:**

1. **DNS failover to backup TURN server:**
   ```bash
   # Update DNS record to point to backup
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://failover.json
   ```

   Example `failover.json`:
   ```json
   {
     "Changes": [{
       "Action": "UPSERT",
       "ResourceRecordSet": {
         "Name": "turn.syncwatch.example.com",
         "Type": "A",
         "TTL": 60,
         "ResourceRecords": [{"Value": "203.0.113.2"}]
       }
     }]
   }
   ```

2. **Verify TURN server:**
   ```bash
   # Test TURN connectivity
   turnutils_uclient -v -t -u <username> -w <password> turn.syncwatch.example.com
   ```

3. **Restart primary TURN server:**
   ```bash
   sudo systemctl restart coturn
   sudo systemctl status coturn
   ```

4. **Revert DNS (when primary is healthy):**
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://restore.json
   ```

**Expected Recovery Time:** 5 minutes

### Application Recovery

**Scenario:** Application server crashes or becomes unresponsive

**Steps:**

1. **Check container/pod status:**
   ```bash
   kubectl get pods -l app=syncwatch-backend
   kubectl describe pod <pod-name>
   kubectl logs <pod-name> --tail=100
   ```

2. **Restart deployment:**
   ```bash
   kubectl rollout restart deployment/syncwatch-backend
   kubectl rollout restart deployment/syncwatch-frontend
   kubectl rollout restart deployment/syncwatch-transcoder
   ```

3. **Check recent changes:**
   ```bash
   kubectl rollout history deployment/syncwatch-backend
   ```

4. **Rollback if needed:**
   ```bash
   kubectl rollout undo deployment/syncwatch-backend
   kubectl rollout status deployment/syncwatch-backend
   ```

5. **Scale horizontally if resource constrained:**
   ```bash
   kubectl scale deployment/syncwatch-backend --replicas=5
   ```

6. **Verify recovery:**
   ```bash
   curl -i https://api.syncwatch.example.com/health
   kubectl get pods -l app=syncwatch-backend
   ```

**Expected Recovery Time:** 5-15 minutes

### Region Failover

**Scenario:** Complete primary region outage

**Steps:**

1. **Activate disaster recovery runbook:**
   - Alert team via emergency channel
   - Designate incident commander
   - Begin status page update

2. **Failover DNS to secondary region:**
   ```bash
   # Update Route53 to point to secondary region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --change-batch file://region-failover.json
   ```

3. **Promote database replica:**
   ```bash
   # Promote read replica in secondary region
   aws rds promote-read-replica \
     --db-instance-identifier syncwatch-db-replica-us-west-2
   ```

4. **Update application configuration:**
   ```bash
   kubectl config use-context production-us-west-2

   kubectl set env deployment/syncwatch-backend \
     DATABASE_URL=<secondary-db-url> \
     REDIS_HOST=<secondary-redis-host> \
     MINIO_ENDPOINT=<secondary-minio-endpoint>
   ```

5. **Scale up secondary region:**
   ```bash
   kubectl scale deployment/syncwatch-backend --replicas=10
   kubectl scale deployment/syncwatch-frontend --replicas=5
   kubectl scale deployment/syncwatch-transcoder --replicas=3
   ```

6. **Monitor traffic shift:**
   ```bash
   # Watch incoming traffic
   kubectl top pods -l app=syncwatch-backend

   # Check error rates
   kubectl logs -f deployment/syncwatch-backend | grep -i error
   ```

7. **Communicate with users:**
   - Update status page
   - Send notification emails
   - Post on social media

**Expected Recovery Time:** 1-4 hours

## Runbooks

### Quick Reference Commands

```bash
# Check health of all services
./scripts/health-check.sh

# View recent backups
ls -lh /var/backups/postgres/ | head -5
aws s3 ls s3://syncwatch-backups/postgres/ --recursive | tail -10

# Verify backup integrity
./scripts/backup/verify-backups.sh

# Restore PostgreSQL
./scripts/backup/restore-postgres.sh <backup-file>

# Restart all services
kubectl rollout restart deployment/syncwatch-backend
kubectl rollout restart deployment/syncwatch-frontend

# Check logs
kubectl logs -f deployment/syncwatch-backend --tail=100
kubectl logs -f deployment/syncwatch-backend | grep -i error
```

## Testing & Validation

### Disaster Recovery Drills

Conduct quarterly DR drills to validate procedures:

**Q1 - Database Failover:**
- Test PostgreSQL replica promotion
- Verify data consistency
- Measure recovery time

**Q2 - Full Region Failover:**
- Complete DNS failover to secondary region
- Verify all services operational
- Test rollback procedure

**Q3 - Backup Restore:**
- Restore PostgreSQL from oldest backup
- Restore Redis from backup
- Verify data integrity

**Q4 - Application Recovery:**
- Simulate pod failures
- Test auto-scaling
- Verify graceful degradation

### Validation Checklist

After any recovery procedure:

- [ ] All health checks passing
- [ ] No error spikes in logs
- [ ] Database connections stable
- [ ] WebSocket connections working
- [ ] Video playback functional
- [ ] Voice chat operational
- [ ] New users can register
- [ ] Existing users can login
- [ ] Rooms can be created/joined
- [ ] Monitoring dashboards updated
- [ ] Incident documented
- [ ] Post-mortem scheduled

## Contact Information

### On-Call Rotation

| Role | Primary | Backup |
|------|---------|--------|
| Incident Commander | DevOps Lead | CTO |
| Database Admin | Backend Lead | Senior Backend Dev |
| Infrastructure | Platform Engineer | DevOps Engineer |
| Communications | Product Manager | Community Manager |

### Emergency Contacts

- **PagerDuty:** https://syncwatch.pagerduty.com
- **Status Page:** https://status.syncwatch.example.com
- **Slack Channel:** #incident-response
- **Emergency Hotline:** +1-XXX-XXX-XXXX

### Vendor Support

- **AWS Support:** 1-888-XXX-XXXX (Enterprise)
- **Cloudflare Support:** cloudflare.com/support
- **DataDog Support:** datadog.com/support

## Post-Incident Procedures

1. **Incident Documentation:**
   - Timeline of events
   - Actions taken
   - Recovery time achieved
   - Data loss (if any)

2. **Post-Mortem (within 48 hours):**
   - What went well
   - What could be improved
   - Action items with owners
   - Update runbooks

3. **Follow-up:**
   - Implement improvements
   - Update documentation
   - Conduct training if needed
   - Review backup/DR strategy

---

**Last Updated:** 2024-01-14
**Next Review:** 2024-04-14
**Owner:** DevOps Team
