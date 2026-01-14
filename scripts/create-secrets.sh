#!/bin/bash
# Script to create Docker Secrets for SyncWatch deployment
# Usage: ./scripts/create-secrets.sh [staging|production]

set -e

ENVIRONMENT="${1:-staging}"

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

echo "Creating Docker Secrets for $ENVIRONMENT environment..."
echo "IMPORTANT: This script will prompt you to enter secret values."
echo "Press Ctrl+C to cancel at any time."
echo ""

# Function to create a secret
create_secret() {
  local secret_name=$1
  local description=$2
  local rotation_days=$3

  echo "Creating secret: $secret_name"
  echo "Description: $description"
  echo "Rotation: Every $rotation_days days"
  echo -n "Enter value (or press Enter to generate random): "
  read -s secret_value
  echo ""

  # Generate random value if empty
  if [ -z "$secret_value" ]; then
    secret_value=$(openssl rand -base64 32)
    echo "Generated random value"
  fi

  # Create Docker secret
  echo "$secret_value" | docker secret create "${ENVIRONMENT}_${secret_name}" - 2>/dev/null || {
    echo "Warning: Secret ${ENVIRONMENT}_${secret_name} already exists. Skipping."
  }

  echo ""
}

# Database password (90 days)
create_secret "db_password" "PostgreSQL database password" 90

# Database URL (90 days)
echo "Creating database_url secret..."
echo -n "Enter PostgreSQL connection URL (e.g., postgresql://user:pass@host:5432/db): "
read -s db_url
echo ""
echo "$db_url" | docker secret create "${ENVIRONMENT}_database_url" - 2>/dev/null || {
  echo "Warning: Secret ${ENVIRONMENT}_database_url already exists. Skipping."
}
echo ""

# Redis URL (90 days)
echo "Creating redis_url secret..."
echo -n "Enter Redis connection URL (e.g., redis://:password@host:6379/0): "
read -s redis_url
echo ""
echo "$redis_url" | docker secret create "${ENVIRONMENT}_redis_url" - 2>/dev/null || {
  echo "Warning: Secret ${ENVIRONMENT}_redis_url already exists. Skipping."
}
echo ""

# MinIO credentials (90 days)
create_secret "minio_access_key" "MinIO/S3 access key ID" 90
create_secret "minio_secret_key" "MinIO/S3 secret access key" 90

# JWT secrets (30 days)
create_secret "jwt_secret" "JWT access token signing secret (min 32 chars)" 30
create_secret "jwt_refresh_secret" "JWT refresh token signing secret (min 32 chars)" 30

# TURN secret (7 days)
create_secret "turn_secret" "TURN server shared secret for credential generation" 7

# Sentry DSN (optional, as needed)
echo "Creating sentry_dsn secret (optional)..."
echo -n "Enter Sentry DSN (or press Enter to skip): "
read -s sentry_dsn
echo ""
if [ -n "$sentry_dsn" ]; then
  echo "$sentry_dsn" | docker secret create "${ENVIRONMENT}_sentry_dsn" - 2>/dev/null || {
    echo "Warning: Secret ${ENVIRONMENT}_sentry_dsn already exists. Skipping."
  }
fi
echo ""

echo "====================================="
echo "Docker Secrets created successfully!"
echo "====================================="
echo ""
echo "To list all secrets:"
echo "  docker secret ls"
echo ""
echo "To inspect a secret (metadata only):"
echo "  docker secret inspect ${ENVIRONMENT}_jwt_secret"
echo ""
echo "To deploy using these secrets:"
echo "  docker stack deploy -c docker-compose.$ENVIRONMENT.yml syncwatch-$ENVIRONMENT"
echo ""
echo "IMPORTANT REMINDERS:"
echo "1. Store secret values in a secure password manager"
echo "2. Set up secret rotation schedule:"
echo "   - Database: Every 90 days"
echo "   - JWT: Every 30 days"
echo "   - TURN: Every 7 days"
echo "3. Never commit secrets to version control"
echo "4. Audit secret access regularly"
echo ""
