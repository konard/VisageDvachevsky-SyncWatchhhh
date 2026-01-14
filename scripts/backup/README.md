# Backup & Restore Scripts

Operational scripts for backing up and restoring SyncWatch data.

## Overview

| Component | Backup Type | Frequency | Retention | Storage |
|-----------|-------------|-----------|-----------|---------|
| PostgreSQL | Full + WAL | Daily | 30 days | S3 + Local (7 days) |
| Redis | RDB Snapshot | Hourly | 7 days | S3 + Local (24 hours) |
| MinIO | Cross-region replication | Continuous | Indefinite | Secondary region |

## Scripts

### `backup-postgres.sh`

Performs full PostgreSQL backup using `pg_dump` and uploads to S3.

**Usage:**
```bash
./scripts/backup/backup-postgres.sh
```

**Environment Variables:**
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - PostgreSQL user (default: syncwatch)
- `DB_NAME` - Database name (default: syncwatch)
- `BACKUP_DIR` - Local backup directory (default: /var/backups/postgres)
- `S3_BACKUP_BUCKET` - S3 bucket name (default: syncwatch-backups)
- `BACKUP_RETENTION_DAYS` - Days to keep backups (default: 30)

**Scheduling:**
Add to crontab for daily execution at 2 AM:
```cron
0 2 * * * /path/to/scripts/backup/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1
```

### `backup-redis.sh`

Performs Redis RDB snapshot backup and uploads to S3.

**Usage:**
```bash
./scripts/backup/backup-redis.sh
```

**Environment Variables:**
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_RDB_PATH` - Path to Redis RDB file (default: /var/lib/redis/dump.rdb)
- `BACKUP_DIR` - Local backup directory (default: /var/backups/redis)
- `S3_BACKUP_BUCKET` - S3 bucket name (default: syncwatch-backups)
- `REDIS_BACKUP_RETENTION_DAYS` - Days to keep backups (default: 7)

**Scheduling:**
Add to crontab for hourly execution:
```cron
0 * * * * /path/to/scripts/backup/backup-redis.sh >> /var/log/backup-redis.log 2>&1
```

### `restore-postgres.sh`

Restores PostgreSQL database from backup file (local or S3).

**Usage:**
```bash
# Restore from local backup
./scripts/backup/restore-postgres.sh syncwatch_20240114_120000.dump

# Restore from S3
./scripts/backup/restore-postgres.sh s3://syncwatch-backups/postgres/syncwatch_20240114_120000.dump
```

**⚠️ WARNING:** This script will **DROP and RECREATE** the target database. All current data will be lost.

**Environment Variables:**
- Same as `backup-postgres.sh`

### `verify-backups.sh`

Verifies backup integrity and tests restore process weekly.

**Usage:**
```bash
./scripts/backup/verify-backups.sh
```

**What it does:**
1. Checks PostgreSQL backup file integrity using `pg_restore --list`
2. Tests restore to temporary database
3. Verifies restored data (table count)
4. Checks Redis backup file size
5. Logs results to `/var/log/backup-verification.log`

**Scheduling:**
Add to crontab for weekly execution on Sundays at 3 AM:
```cron
0 3 * * 0 /path/to/scripts/backup/verify-backups.sh >> /var/log/backup-verification.log 2>&1
```

## Prerequisites

### PostgreSQL Backups
- `pg_dump` and `pg_restore` utilities installed
- PostgreSQL user with appropriate permissions
- AWS CLI configured (for S3 upload)

### Redis Backups
- `redis-cli` utility installed
- Redis RDB persistence enabled
- AWS CLI configured (for S3 upload)

### S3 Configuration
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
```

## Recovery Procedures

### PostgreSQL Recovery

1. **Full Database Restore:**
   ```bash
   ./scripts/backup/restore-postgres.sh <backup-file>
   ```

2. **Point-in-Time Recovery (PITR):**
   Requires WAL archiving to be configured in PostgreSQL.
   ```bash
   # Stop PostgreSQL
   sudo systemctl stop postgresql

   # Restore base backup
   cd /var/lib/postgresql/14/main
   rm -rf *
   pg_restore -d postgres /path/to/backup.dump

   # Configure recovery
   cat > recovery.conf <<EOF
   restore_command = 'cp /var/lib/postgresql/14/wal_archive/%f %p'
   recovery_target_time = '2024-01-14 12:00:00'
   EOF

   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

### Redis Recovery

1. **Stop Redis:**
   ```bash
   sudo systemctl stop redis
   ```

2. **Replace RDB file:**
   ```bash
   cp /var/backups/redis/redis_YYYYMMDD_HHMMSS.rdb /var/lib/redis/dump.rdb
   chown redis:redis /var/lib/redis/dump.rdb
   ```

3. **Start Redis:**
   ```bash
   sudo systemctl start redis
   ```

## MinIO Cross-Region Replication

MinIO handles replication automatically when configured with:

```yaml
# In docker-compose.yml or MinIO config
mc admin bucket remote add minio/videos \
  https://backup-minio.example.com/videos \
  --service replication \
  --region us-west-2

mc replicate add minio/videos \
  --remote-bucket arn:minio:replication::backup-minio.example.com:videos \
  --replicate delete,delete-marker
```

## Monitoring

### Check Last Backup Status

```bash
# PostgreSQL
ls -lth /var/backups/postgres/ | head -5

# Redis
ls -lth /var/backups/redis/ | head -5

# S3
aws s3 ls s3://syncwatch-backups/postgres/ --recursive --human-readable | tail -10
```

### Backup Size Monitoring

```bash
# Local disk usage
du -sh /var/backups/*

# S3 usage
aws s3 ls s3://syncwatch-backups --recursive --summarize
```

## Troubleshooting

### Backup fails with "permission denied"

```bash
# Grant PostgreSQL user backup permissions
sudo -u postgres psql -c "GRANT pg_read_all_data TO syncwatch;"
```

### S3 upload fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://syncwatch-backups/
```

### Redis BGSAVE fails

```bash
# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Check disk space
df -h /var/lib/redis
```

## Security Notes

- Backup files contain sensitive data - ensure proper access controls
- S3 buckets should have encryption at rest enabled
- Use IAM roles instead of access keys when possible
- Rotate database credentials regularly
- Monitor S3 bucket access logs
