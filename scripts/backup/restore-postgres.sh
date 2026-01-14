#!/bin/bash
# PostgreSQL Restore Script
# Restores database from backup file or S3

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
S3_BUCKET="${S3_BACKUP_BUCKET:-syncwatch-backups}"

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file|s3://bucket/path/backup.dump>"
  echo ""
  echo "Examples:"
  echo "  $0 syncwatch_20240114_120000.dump"
  echo "  $0 s3://syncwatch-backups/postgres/syncwatch_20240114_120000.dump"
  echo ""
  echo "Available local backups:"
  ls -lh "${BACKUP_DIR}/"*.dump 2>/dev/null || echo "  No local backups found"
  exit 1
fi

BACKUP_FILE="$1"
LOCAL_BACKUP=""

# Download from S3 if needed
if [[ "${BACKUP_FILE}" == s3://* ]]; then
  if ! command -v aws &> /dev/null; then
    echo "Error: aws CLI not found"
    exit 1
  fi

  TEMP_FILE="${BACKUP_DIR}/restore_$(date +%Y%m%d_%H%M%S).dump"
  echo "[$(date)] Downloading backup from S3: ${BACKUP_FILE}"
  aws s3 cp "${BACKUP_FILE}" "${TEMP_FILE}"
  LOCAL_BACKUP="${TEMP_FILE}"
else
  # Use local backup file
  if [ -f "${BACKUP_FILE}" ]; then
    LOCAL_BACKUP="${BACKUP_FILE}"
  elif [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    LOCAL_BACKUP="${BACKUP_DIR}/${BACKUP_FILE}"
  else
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
  fi
fi

echo "[$(date)] Using backup file: ${LOCAL_BACKUP}"

# Confirm restore
read -p "WARNING: This will REPLACE the current database. Are you sure? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Drop existing connections
echo "[$(date)] Dropping existing database connections"
psql \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname=postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME:-syncwatch}' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "[$(date)] Recreating database"
psql \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname=postgres \
  -c "DROP DATABASE IF EXISTS \"${DB_NAME:-syncwatch}\";" \
  -c "CREATE DATABASE \"${DB_NAME:-syncwatch}\";"

# Restore from backup
echo "[$(date)] Restoring database from backup"
pg_restore \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname="${DB_NAME:-syncwatch}" \
  --verbose \
  --no-owner \
  --no-acl \
  "${LOCAL_BACKUP}"

echo "[$(date)] Database restore complete"

# Clean up temporary file if downloaded from S3
if [[ "${BACKUP_FILE}" == s3://* ]] && [ -f "${LOCAL_BACKUP}" ]; then
  rm "${LOCAL_BACKUP}"
  echo "[$(date)] Temporary file cleaned up"
fi

echo "[$(date)] Restore successful!"
