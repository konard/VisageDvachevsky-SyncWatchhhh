#!/bin/bash
# Script to rotate a Docker Secret
# Usage: ./scripts/rotate-secret.sh [environment] [secret_name]

set -e

ENVIRONMENT="${1}"
SECRET_NAME="${2}"

if [ -z "$ENVIRONMENT" ] || [ -z "$SECRET_NAME" ]; then
  echo "Usage: $0 [staging|production] [secret_name]"
  echo ""
  echo "Available secrets:"
  echo "  - db_password (90 days)"
  echo "  - database_url (90 days)"
  echo "  - redis_url (90 days)"
  echo "  - minio_access_key (90 days)"
  echo "  - minio_secret_key (90 days)"
  echo "  - jwt_secret (30 days)"
  echo "  - jwt_refresh_secret (30 days)"
  echo "  - turn_secret (7 days)"
  echo ""
  echo "Example:"
  echo "  $0 production turn_secret"
  exit 1
fi

FULL_SECRET_NAME="${ENVIRONMENT}_${SECRET_NAME}"

echo "====================================="
echo "Secret Rotation for $FULL_SECRET_NAME"
echo "====================================="
echo ""

# Check if secret exists
if ! docker secret inspect "$FULL_SECRET_NAME" >/dev/null 2>&1; then
  echo "Error: Secret $FULL_SECRET_NAME does not exist."
  echo "Create it first using: ./scripts/create-secrets.sh $ENVIRONMENT"
  exit 1
fi

echo "WARNING: This will rotate the secret and update the service."
echo "The service will be briefly interrupted during the update."
echo ""
echo -n "Enter new value for $SECRET_NAME (or press Enter to generate random): "
read -s new_value
echo ""

# Generate random value if empty
if [ -z "$new_value" ]; then
  new_value=$(openssl rand -base64 32)
  echo "Generated random value"
fi

# Create new secret with version suffix
NEW_SECRET_NAME="${FULL_SECRET_NAME}_v$(date +%s)"
echo "$new_value" | docker secret create "$NEW_SECRET_NAME" -

echo "New secret created: $NEW_SECRET_NAME"
echo ""

echo "Next steps (manual):"
echo "1. Update docker-compose.$ENVIRONMENT.yml to use $NEW_SECRET_NAME"
echo "2. Redeploy the stack:"
echo "   docker stack deploy -c docker-compose.$ENVIRONMENT.yml syncwatch-$ENVIRONMENT"
echo "3. Verify services are running correctly"
echo "4. Remove old secret after verification:"
echo "   docker secret rm $FULL_SECRET_NAME"
echo "5. Rename new secret to standard name:"
echo "   (Docker doesn't support renaming, use the versioned name or create-secrets.sh)"
echo ""
echo "AUDIT LOG:"
echo "  Rotated: $FULL_SECRET_NAME"
echo "  Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  New secret: $NEW_SECRET_NAME"
echo ""
