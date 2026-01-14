#!/bin/bash
# PostgreSQL Backup Script
# Performs daily full backup with WAL archiving to S3

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="syncwatch_${TIMESTAMP}"
S3_BUCKET="${S3_BACKUP_BUCKET:-syncwatch-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "[$(date)] Starting PostgreSQL backup: ${BACKUP_NAME}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform pg_dump with compression
pg_dump \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname="${DB_NAME:-syncwatch}" \
  --format=custom \
  --file="${BACKUP_DIR}/${BACKUP_NAME}.dump" \
  --verbose

echo "[$(date)] Database dump complete: ${BACKUP_DIR}/${BACKUP_NAME}.dump"

# Upload to S3 if configured
if command -v aws &> /dev/null && [ -n "${S3_BUCKET}" ]; then
  echo "[$(date)] Uploading to S3: s3://${S3_BUCKET}/postgres/${BACKUP_NAME}.dump"

  aws s3 cp \
    "${BACKUP_DIR}/${BACKUP_NAME}.dump" \
    "s3://${S3_BUCKET}/postgres/${BACKUP_NAME}.dump" \
    --storage-class STANDARD_IA

  echo "[$(date)] Upload complete"

  # Clean up old S3 backups (keep last RETENTION_DAYS days)
  CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
  echo "[$(date)] Cleaning up S3 backups older than ${CUTOFF_DATE}"

  aws s3 ls "s3://${S3_BUCKET}/postgres/" | while read -r line; do
    BACKUP_DATE=$(echo "$line" | awk '{print $4}' | grep -oP '\d{8}' || echo "")
    if [ -n "${BACKUP_DATE}" ] && [ "${BACKUP_DATE}" -lt "${CUTOFF_DATE}" ]; then
      BACKUP_FILE=$(echo "$line" | awk '{print $4}')
      echo "[$(date)] Deleting old backup: ${BACKUP_FILE}"
      aws s3 rm "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}"
    fi
  done
else
  echo "[$(date)] S3 upload skipped (aws CLI not found or S3_BUCKET not configured)"
fi

# Clean up local backups (keep last 7 days)
echo "[$(date)] Cleaning up local backups older than 7 days"
find "${BACKUP_DIR}" -name "syncwatch_*.dump" -mtime +7 -delete

echo "[$(date)] Backup complete: ${BACKUP_NAME}"
