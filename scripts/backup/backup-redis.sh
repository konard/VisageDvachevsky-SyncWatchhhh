#!/bin/bash
# Redis Backup Script
# Performs hourly RDB snapshots and uploads to S3

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/redis}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="redis_${TIMESTAMP}"
S3_BUCKET="${S3_BACKUP_BUCKET:-syncwatch-backups}"
RETENTION_DAYS="${REDIS_BACKUP_RETENTION_DAYS:-7}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "[$(date)] Starting Redis backup: ${BACKUP_NAME}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Trigger BGSAVE (background save)
if command -v redis-cli &> /dev/null; then
  echo "[$(date)] Triggering Redis BGSAVE"
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE

  # Wait for BGSAVE to complete
  while [ "$(redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} LASTSAVE)" == "$(redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT} LASTSAVE)" ]; do
    sleep 1
  done

  echo "[$(date)] BGSAVE complete"

  # Copy RDB file
  REDIS_RDB_PATH="${REDIS_RDB_PATH:-/var/lib/redis/dump.rdb}"
  if [ -f "${REDIS_RDB_PATH}" ]; then
    cp "${REDIS_RDB_PATH}" "${BACKUP_DIR}/${BACKUP_NAME}.rdb"
    echo "[$(date)] RDB file copied: ${BACKUP_DIR}/${BACKUP_NAME}.rdb"
  else
    echo "[$(date)] Warning: RDB file not found at ${REDIS_RDB_PATH}"
    exit 1
  fi
else
  echo "[$(date)] Error: redis-cli not found"
  exit 1
fi

# Upload to S3 if configured
if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
  echo "[$(date)] Uploading to S3: s3://${S3_BUCKET}/redis/${BACKUP_NAME}.rdb"

  aws s3 cp \
    "${BACKUP_DIR}/${BACKUP_NAME}.rdb" \
    "s3://${S3_BUCKET}/redis/${BACKUP_NAME}.rdb" \
    --storage-class STANDARD_IA

  echo "[$(date)] Upload complete"

  # Clean up old S3 backups (keep last RETENTION_DAYS days)
  CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
  echo "[$(date)] Cleaning up S3 backups older than ${CUTOFF_DATE}"

  aws s3 ls "s3://${S3_BUCKET}/redis/" | while read -r line; do
    BACKUP_DATE=$(echo "$line" | awk '{print $4}' | grep -oP '\d{8}' || echo "")
    if [ -n "${BACKUP_DATE}" ] && [ "${BACKUP_DATE}" -lt "${CUTOFF_DATE}" ]; then
      BACKUP_FILE=$(echo "$line" | awk '{print $4}')
      echo "[$(date)] Deleting old backup: ${BACKUP_FILE}"
      aws s3 rm "s3://${S3_BUCKET}/redis/${BACKUP_FILE}"
    fi
  done
else
  echo "[$(date)] S3 upload skipped (aws CLI not found or S3_BUCKET not configured)"
fi

# Clean up local backups (keep last 24 hours)
echo "[$(date)] Cleaning up local backups older than 24 hours"
find "${BACKUP_DIR}" -name "redis_*.rdb" -mmin +1440 -delete

echo "[$(date)] Backup complete: ${BACKUP_NAME}"
