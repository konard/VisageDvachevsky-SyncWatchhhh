# SyncWatch Deployment Guide

Quick reference for deploying SyncWatch across different environments.

## Quick Start

### Development
```bash
# 1. Copy environment file
cp backend/.env.example backend/.env

# 2. Start all services
docker-compose -f docker-compose.dev.yml up

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# MinIO Console: http://localhost:9001
```

### Staging
```bash
# 1. Create secrets
./scripts/create-secrets.sh staging

# 2. Deploy stack
export VERSION=staging-latest
docker stack deploy -c docker-compose.staging.yml syncwatch-staging

# 3. Verify deployment
docker service ls
curl https://staging-api.syncwatch.example/health
```

### Production
```bash
# 1. Create secrets (first time only)
./scripts/create-secrets.sh production

# 2. Deploy stack
export VERSION=v1.0.0
docker stack deploy -c docker-compose.prod.yml syncwatch-production

# 3. Verify deployment
docker service ls
curl https://api.syncwatch.example/health
```

## Environment Matrix

| Environment | Config File | Secrets | Deploy Method | Domain |
|-------------|-------------|---------|---------------|--------|
| Development | `docker-compose.dev.yml` | `.env` files | `docker-compose up` | localhost |
| Staging | `docker-compose.staging.yml` | Docker Secrets | `docker stack deploy` | staging.syncwatch.example |
| Production | `docker-compose.prod.yml` | Docker Secrets | `docker stack deploy` | syncwatch.example |

## Prerequisites

### All Environments
- Docker 20.10+ and Docker Compose 2.0+
- Node.js 20+ (for local development)
- PostgreSQL 15+ (or use Docker service)
- Redis 7+ (or use Docker service)
- MinIO/S3 (or use Docker service)

### Staging & Production Only
- Docker Swarm: `docker swarm init`
- Domain with DNS configured
- TLS certificates (Let's Encrypt recommended)
- Secrets created: `./scripts/create-secrets.sh [environment]`

## Deployment Workflows

### Manual Deployment

#### Staging
```bash
# From develop branch
git checkout develop
git pull origin develop

# Build and push images
docker build -t ghcr.io/visagedvachevsky/syncwatch-backend:staging-latest ./backend
docker build -t ghcr.io/visagedvachevsky/syncwatch-frontend:staging-latest ./frontend
docker build -t ghcr.io/visagedvachevsky/syncwatch-transcoder:staging-latest ./transcoder

docker push ghcr.io/visagedvachevsky/syncwatch-backend:staging-latest
docker push ghcr.io/visagedvachevsky/syncwatch-frontend:staging-latest
docker push ghcr.io/visagedvachevsky/syncwatch-transcoder:staging-latest

# Deploy
export VERSION=staging-latest
docker stack deploy -c docker-compose.staging.yml syncwatch-staging
```

#### Production
```bash
# From main branch with version tag
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0

# Build and push images
docker build -t ghcr.io/visagedvachevsky/syncwatch-backend:v1.0.0 ./backend
docker build -t ghcr.io/visagedvachevsky/syncwatch-frontend:v1.0.0 ./frontend
docker build -t ghcr.io/visagedvachevsky/syncwatch-transcoder:v1.0.0 ./transcoder

docker push ghcr.io/visagedvachevsky/syncwatch-backend:v1.0.0
docker push ghcr.io/visagedvachevsky/syncwatch-frontend:v1.0.0
docker push ghcr.io/visagedvachevsky/syncwatch-transcoder:v1.0.0

# Deploy
export VERSION=v1.0.0
docker stack deploy -c docker-compose.prod.yml syncwatch-production
```

### Automated Deployment (GitHub Actions)

#### Staging (Auto-deploy on push to develop)
- Triggers on push to `develop` branch
- Builds and pushes Docker images
- Deploys to staging server via SSH
- Workflow: `.github/workflows/deploy-staging.yml`

#### Production (Manual trigger with version)
- Triggered manually via GitHub Actions UI
- Requires version tag input (e.g., `v1.0.0`)
- Creates GitHub release on success
- Workflow: `.github/workflows/deploy-production.yml`

**To trigger production deployment**:
1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Enter version tag (must exist in Git)
4. Click "Run workflow"

## Health Checks

### Service Health
```bash
# Check all services
docker service ls

# Check specific service
docker service ps syncwatch-production_backend

# View service logs
docker service logs syncwatch-production_backend --tail 100 --follow
```

### Application Health
```bash
# Development
curl http://localhost:4000/health

# Staging
curl https://staging-api.syncwatch.example/health

# Production
curl https://api.syncwatch.example/health
```

### Expected Response
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "minio": "healthy"
  }
}
```

## Rollback Procedures

### Staging Rollback
```bash
# Find previous version
docker service ps syncwatch-staging_backend --format "{{.Image}}" | head -2

# Deploy previous version
export VERSION=staging-abc123
docker stack deploy -c docker-compose.staging.yml syncwatch-staging
```

### Production Rollback
```bash
# Emergency rollback to previous version
export VERSION=v0.9.9  # Previous stable version
docker stack deploy -c docker-compose.prod.yml syncwatch-production

# Verify rollback
curl https://api.syncwatch.example/health
docker service logs syncwatch-production_backend
```

## Secrets Management

### Creating Secrets
```bash
# Interactive (recommended)
./scripts/create-secrets.sh [staging|production]

# Manual
echo "secret_value" | docker secret create staging_jwt_secret -
```

### Rotating Secrets
```bash
# Automated rotation script
./scripts/rotate-secret.sh production turn_secret

# Manual rotation
echo "new_value" | docker secret create production_jwt_secret_v2 -
# Update docker-compose to reference _v2
docker stack deploy -c docker-compose.prod.yml syncwatch-production
docker secret rm production_jwt_secret  # After verification
```

### Rotation Schedule
| Secret | Frequency | Command |
|--------|-----------|---------|
| TURN_SECRET | 7 days | `./scripts/rotate-secret.sh production turn_secret` |
| JWT_SECRET | 30 days | `./scripts/rotate-secret.sh production jwt_secret` |
| DATABASE_URL | 90 days | `./scripts/rotate-secret.sh production database_url` |

## Monitoring

### Service Status
```bash
# List all services with replicas
docker service ls

# Expected output:
# NAME                             MODE         REPLICAS
# syncwatch-production_backend     replicated   2/2
# syncwatch-production_frontend    replicated   2/2
# syncwatch-production_db          replicated   1/1
# syncwatch-production_redis       replicated   1/1
```

### Resource Usage
```bash
# Node resources
docker node ls

# Service resources
docker stats $(docker ps --format "{{.Names}}")
```

### Logs
```bash
# Real-time logs
docker service logs -f syncwatch-production_backend

# Last 100 lines
docker service logs --tail 100 syncwatch-production_backend

# Specific time range
docker service logs --since 1h syncwatch-production_backend
```

## Troubleshooting

### Service Won't Start
```bash
# 1. Check service logs
docker service logs syncwatch-production_backend

# 2. Check service inspect
docker service inspect syncwatch-production_backend

# 3. Verify secrets exist
docker secret ls | grep production

# 4. Check node resources
docker node ls
docker node inspect self --format "{{.Status.State}}"
```

### Database Connection Failed
```bash
# 1. Check database service
docker service ps syncwatch-production_db

# 2. Test database connectivity
docker exec -it $(docker ps -q -f name=syncwatch-production_db) psql -U syncwatch_prod -d syncwatch_prod

# 3. Verify DATABASE_URL secret
docker secret inspect production_database_url
```

### High Memory Usage
```bash
# 1. Check service limits
docker service inspect syncwatch-production_transcoder --format "{{.Spec.TaskTemplate.Resources}}"

# 2. Scale down if needed
docker service scale syncwatch-production_transcoder=1

# 3. Update resource limits in docker-compose.yml
# Then redeploy
```

## Maintenance Windows

### Planned Maintenance
1. **Schedule maintenance** (ideally low-traffic hours)
2. **Notify users** via application banner
3. **Perform deployment** using standard procedures
4. **Monitor metrics** for 30 minutes post-deployment
5. **Remove maintenance banner**

### Emergency Maintenance
1. **Assess severity** (P0/P1/P2)
2. **Rollback if critical** (P0)
3. **Fix and redeploy** (P1/P2)
4. **Post-mortem** within 24 hours

## Additional Resources

- [Environment & Secrets Management](./ENVIRONMENT_SECRETS.md)
- [Technical Specification](./TECHNICAL_SPECIFICATION.md) - Section 9
- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For deployment issues:
1. Check service logs first
2. Review this documentation
3. Open an issue on GitHub
4. Contact DevOps team for critical production issues
