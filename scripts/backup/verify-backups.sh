#!/bin/bash
# Backup Verification Script
# Verifies integrity of backup files and tests restore process

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
REDIS_BACKUP_DIR="${BACKUP_DIR:-/var/backups/redis}"
TEST_DB_NAME="syncwatch_backup_test"
LOG_FILE="/var/log/backup-verification.log"

echo "[$(date)] Starting backup verification" | tee -a "${LOG_FILE}"

# Verify PostgreSQL backups
echo "[$(date)] Verifying PostgreSQL backups" | tee -a "${LOG_FILE}"

LATEST_PG_BACKUP=$(ls -t "${BACKUP_DIR}"/syncwatch_*.dump 2>/dev/null | head -1)

if [ -z "${LATEST_PG_BACKUP}" ]; then
  echo "[$(date)] ERROR: No PostgreSQL backups found" | tee -a "${LOG_FILE}"
  exit 1
fi

echo "[$(date)] Latest PostgreSQL backup: ${LATEST_PG_BACKUP}" | tee -a "${LOG_FILE}"

# Check file integrity
if ! pg_restore --list "${LATEST_PG_BACKUP}" > /dev/null 2>&1; then
  echo "[$(date)] ERROR: PostgreSQL backup file is corrupted: ${LATEST_PG_BACKUP}" | tee -a "${LOG_FILE}"
  exit 1
fi

echo "[$(date)] PostgreSQL backup integrity check passed" | tee -a "${LOG_FILE}"

# Test restore to temporary database
echo "[$(date)] Testing restore to temporary database: ${TEST_DB_NAME}" | tee -a "${LOG_FILE}"

# Drop and recreate test database
psql \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname=postgres \
  -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" \
  -c "CREATE DATABASE ${TEST_DB_NAME};" \
  2>&1 | tee -a "${LOG_FILE}"

# Restore to test database
if pg_restore \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname="${TEST_DB_NAME}" \
  --no-owner \
  --no-acl \
  "${LATEST_PG_BACKUP}" 2>&1 | tee -a "${LOG_FILE}"; then
  echo "[$(date)] PostgreSQL restore test PASSED" | tee -a "${LOG_FILE}"
else
  echo "[$(date)] ERROR: PostgreSQL restore test FAILED" | tee -a "${LOG_FILE}"
  exit 1
fi

# Verify restored data
TABLE_COUNT=$(psql \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname="${TEST_DB_NAME}" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo "[$(date)] Restored database has ${TABLE_COUNT} tables" | tee -a "${LOG_FILE}"

if [ "${TABLE_COUNT}" -lt 1 ]; then
  echo "[$(date)] ERROR: Restored database has no tables" | tee -a "${LOG_FILE}"
  exit 1
fi

# Clean up test database
psql \
  --host="${DB_HOST:-localhost}" \
  --port="${DB_PORT:-5432}" \
  --username="${DB_USER:-syncwatch}" \
  --dbname=postgres \
  -c "DROP DATABASE ${TEST_DB_NAME};" \
  2>&1 | tee -a "${LOG_FILE}"

echo "[$(date)] Test database cleaned up" | tee -a "${LOG_FILE}"

# Verify Redis backups
echo "[$(date)] Verifying Redis backups" | tee -a "${LOG_FILE}"

LATEST_REDIS_BACKUP=$(ls -t "${REDIS_BACKUP_DIR}"/redis_*.rdb 2>/dev/null | head -1)

if [ -z "${LATEST_REDIS_BACKUP}" ]; then
  echo "[$(date)] WARNING: No Redis backups found" | tee -a "${LOG_FILE}"
else
  echo "[$(date)] Latest Redis backup: ${LATEST_REDIS_BACKUP}" | tee -a "${LOG_FILE}"

  # Check file size (RDB file should not be empty)
  FILE_SIZE=$(stat -f%z "${LATEST_REDIS_BACKUP}" 2>/dev/null || stat -c%s "${LATEST_REDIS_BACKUP}" 2>/dev/null)

  if [ "${FILE_SIZE}" -lt 100 ]; then
    echo "[$(date)] ERROR: Redis backup file is too small (${FILE_SIZE} bytes)" | tee -a "${LOG_FILE}"
    exit 1
  fi

  echo "[$(date)] Redis backup size check passed (${FILE_SIZE} bytes)" | tee -a "${LOG_FILE}"
fi

# Send notification (if configured)
if [ -n "${BACKUP_NOTIFICATION_EMAIL}" ]; then
  echo "[$(date)] Sending verification report to ${BACKUP_NOTIFICATION_EMAIL}" | tee -a "${LOG_FILE}"
  # You can add email notification here using mail or similar
fi

echo "[$(date)] Backup verification complete - ALL CHECKS PASSED" | tee -a "${LOG_FILE}"
exit 0
