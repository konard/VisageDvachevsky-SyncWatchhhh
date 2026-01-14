#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait for PostgreSQL to be ready (using a simple retry loop)
max_retries=30
retry_count=0

# Change to the backend directory for Prisma commands
cd /app/backend

until npx prisma db execute --stdin <<EOF > /dev/null 2>&1 || [ $retry_count -ge $max_retries ]
SELECT 1;
EOF
do
  echo "Database not ready yet, waiting... (attempt $((retry_count + 1))/$max_retries)"
  sleep 2
  retry_count=$((retry_count + 1))
done

if [ $retry_count -ge $max_retries ]; then
  echo "ERROR: Database connection timed out after $max_retries attempts"
  exit 1
fi

echo "Database is ready!"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting production server..."
cd /app
exec node backend/dist/index.js
