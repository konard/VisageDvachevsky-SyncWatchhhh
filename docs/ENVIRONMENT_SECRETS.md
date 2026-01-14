# Environment Configuration & Secrets Management

This document describes how SyncWatch manages environment-specific configuration and secrets across development, staging, and production environments.

## Table of Contents

1. [Overview](#overview)
2. [Environment Matrix](#environment-matrix)
3. [Environment Configuration](#environment-configuration)
4. [Secrets Management](#secrets-management)
5. [Secret Rotation](#secret-rotation)
6. [Deployment Guide](#deployment-guide)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Overview

SyncWatch implements proper environment separation to ensure:

- **Production secrets are NEVER in repository or Docker images**
- Each environment has isolated resources (databases, Redis, storage)
- Secrets can be rotated regularly without code changes
- Audit trail for secret access and rotation
- Zero-trust security model

### Key Principles

1. **Never commit secrets** - Use `.env.example` files as templates
2. **Use Docker Secrets** - For staging and production deployments
3. **Rotate regularly** - Follow rotation schedules for each secret category
4. **Audit access** - Log all secret access for security monitoring
5. **Isolate environments** - Separate resources prevent cross-contamination

## Environment Matrix

| Environment | Purpose | Auto-Deploy | Persistence | Domain |
|-------------|---------|-------------|-------------|--------|
| **Development** | Local dev & feature work | No | Ephemeral | localhost |
| **Staging** | Integration testing, QA | Yes (from `develop`) | Short-lived | staging.syncwatch.example |
| **Production** | Live users | Manual (from `main`) | Persistent | syncwatch.example |

### Resource Isolation

| Resource | Development | Staging | Production |
|----------|-------------|---------|------------|
| **PostgreSQL** | `syncwatch_dev` | `syncwatch_staging` | `syncwatch_prod` |
| **Redis** | DB 0-4 (shared) | Dedicated instance | Dedicated cluster |
| **MinIO Bucket** | `syncwatch-dev` | `syncwatch-staging` | `syncwatch-prod` |
| **TURN Server** | Shared test | Environment-specific | Rotated, environment-specific |

## Environment Configuration

### Development Environment

**Purpose**: Local development with fast iteration

**Setup**:
1. Copy example file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Start services:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

**Features**:
- Debug logging enabled
- Hot reload for all services
- Relaxed security (weak passwords OK)
- No secret rotation required

### Staging Environment

**Purpose**: Pre-production testing with production-like settings

**Setup**:
1. Copy example file:
   ```bash
   cp .env.staging.example .env.staging
   ```

2. Create Docker Secrets:
   ```bash
   ./scripts/create-secrets.sh staging
   ```

3. Deploy:
   ```bash
   docker stack deploy -c docker-compose.staging.yml syncwatch-staging
   ```

**Features**:
- Production-like configuration
- Metrics and tracing enabled
- Separate database and Redis
- Secret rotation every 7-90 days
- Auto-deployed from `develop` branch

### Production Environment

**Purpose**: Live deployment for end users

**Setup**:
1. **NEVER** copy `.env.production.example` to `.env.production` - use Docker Secrets only

2. Create Docker Secrets:
   ```bash
   ./scripts/create-secrets.sh production
   ```

3. Deploy:
   ```bash
   docker stack deploy -c docker-compose.prod.yml syncwatch-production
   ```

**Features**:
- Maximum security (all secrets via Docker Secrets)
- Resource limits enforced
- High availability (replicas: 2)
- Strict secret rotation schedules
- Manual deployment only

## Secrets Management

### Secret Categories

| Category | Examples | Rotation Frequency | Priority |
|----------|----------|-------------------|----------|
| **Database** | `DATABASE_URL`, `POSTGRES_PASSWORD` | 90 days | Critical |
| **Auth** | `JWT_SECRET`, `SESSION_SECRET` | 30 days | Critical |
| **Storage** | `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | 90 days | Critical |
| **TURN** | `TURN_SECRET` | 7 days | High |
| **External** | `GITHUB_TOKEN`, `SENTRY_DSN` | As needed | Medium |

### Docker Secrets (Recommended)

Docker Secrets provide secure secret management for Docker Swarm deployments.

#### Creating Secrets

```bash
# Interactive script (recommended)
./scripts/create-secrets.sh production

# Manual creation
echo "your_secret_value" | docker secret create production_jwt_secret -
```

#### Using Secrets in Services

```yaml
services:
  backend:
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
    secrets:
      - jwt_secret

secrets:
  jwt_secret:
    external: true
```

The application automatically reads from `_FILE` paths via `backend/src/config/secrets.ts`.

### Environment Variables (Development Only)

For local development, use environment variables directly:

```bash
# backend/.env
JWT_SECRET=dev_jwt_secret_change_in_production
DATABASE_URL=postgresql://syncwatch:syncwatch_dev@localhost:5432/syncwatch_dev
```

**WARNING**: Never use environment variables for staging or production secrets.

### Secret Loading Priority

1. **Docker Secret file** (`/run/secrets/secret_name` via `SECRET_NAME_FILE`)
2. **Environment variable** (`SECRET_NAME`)
3. **Default value** (development only)

Example:
```typescript
// Automatically checks:
// 1. /run/secrets/jwt_secret (if JWT_SECRET_FILE is set)
// 2. process.env.JWT_SECRET
// 3. Default value (dev only)
const jwtSecret = getSecret('JWT_SECRET', 'dev_default');
```

## Secret Rotation

### Rotation Schedules

| Secret | Rotation | Automation | Downtime |
|--------|----------|------------|----------|
| `TURN_SECRET` | 7 days | Semi-automated | None |
| `JWT_SECRET` | 30 days | Manual | Brief (<30s) |
| `JWT_REFRESH_SECRET` | 30 days | Manual | Brief (<30s) |
| `DATABASE_URL` | 90 days | Manual | Brief (<30s) |
| `MINIO_ACCESS_KEY` | 90 days | Manual | Brief (<30s) |

### Rotation Procedure

#### Automated Rotation (TURN Secret)

```bash
# Rotate TURN secret (every 7 days)
./scripts/rotate-secret.sh production turn_secret
```

This creates a new versioned secret and provides instructions for updating the deployment.

#### Manual Rotation

1. **Generate new secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Create new Docker secret** with version suffix:
   ```bash
   echo "new_secret_value" | docker secret create production_jwt_secret_v$(date +%s) -
   ```

3. **Update docker-compose** to use new secret:
   ```yaml
   secrets:
     jwt_secret:
       external: true
       name: production_jwt_secret_v1234567890
   ```

4. **Redeploy stack**:
   ```bash
   docker stack deploy -c docker-compose.prod.yml syncwatch-production
   ```

5. **Verify** services are healthy:
   ```bash
   docker service ls
   docker service logs syncwatch-production_backend
   ```

6. **Remove old secret** after verification:
   ```bash
   docker secret rm production_jwt_secret
   ```

7. **Update audit log** (see `docs/AUDIT_LOG.md`)

### JWT Secret Rotation (Special Case)

JWT secrets require careful rotation to avoid invalidating active sessions:

1. **Dual-key period**: Add new secret alongside old one
2. **Sign with new, verify with both**: Update signing to use new key, keep old key for verification
3. **Grace period**: Wait for old tokens to expire (15m for access, 7d for refresh)
4. **Remove old key**: After grace period, remove old secret

See `backend/src/config/jwt-rotation.ts` for implementation details.

## Deployment Guide

### Prerequisites

- Docker Swarm initialized: `docker swarm init`
- Secrets created: `./scripts/create-secrets.sh [environment]`
- Domain DNS configured (staging/production)
- TLS certificates ready (staging/production)

### Staging Deployment

```bash
# 1. Create secrets
./scripts/create-secrets.sh staging

# 2. Set environment variables
export VERSION=staging-$(git rev-parse --short HEAD)
export DOCKER_REGISTRY=ghcr.io/visagedvachevsky

# 3. Deploy stack
docker stack deploy -c docker-compose.staging.yml syncwatch-staging

# 4. Verify deployment
docker service ls
docker service logs syncwatch-staging_backend
```

### Production Deployment

```bash
# 1. Create secrets (first time only)
./scripts/create-secrets.sh production

# 2. Set environment variables
export VERSION=$(git describe --tags --always)
export DOCKER_REGISTRY=ghcr.io/visagedvachevsky

# 3. Deploy stack
docker stack deploy -c docker-compose.prod.yml syncwatch-production

# 4. Verify deployment
docker service ls
docker service logs syncwatch-production_backend

# 5. Run smoke tests
curl https://api.syncwatch.example/health
```

## CI/CD Integration

### GitHub Actions Secrets

Store secrets in GitHub repository settings:

- Settings → Secrets and variables → Actions → New repository secret

**Required Secrets**:
- `STAGING_DATABASE_URL` - Staging database connection string
- `STAGING_JWT_SECRET` - Staging JWT signing secret
- `STAGING_TURN_SECRET` - Staging TURN server secret
- `PROD_DATABASE_URL` - Production database connection string
- `PROD_JWT_SECRET` - Production JWT signing secret
- `PROD_TURN_SECRET` - Production TURN server secret

### Deployment Workflow

```yaml
# .github/workflows/deploy-staging.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.STAGING_JWT_SECRET }}
          TURN_SECRET: ${{ secrets.STAGING_TURN_SECRET }}
        run: |
          # Secrets injected via environment variables
          # Never logged, never stored in artifacts
          ./deploy-staging.sh
```

### Secret Injection Best Practices

1. **Never log secrets**: Use `echo "::add-mask::$SECRET"` in workflows
2. **Use repository secrets**: Never hardcode in workflow files
3. **Rotate CI/CD secrets**: Include in rotation schedule
4. **Audit access**: Review GitHub audit log regularly

## Troubleshooting

### Secret Not Found

**Error**: `Secret "jwt_secret" not found`

**Solution**:
1. Check secret exists: `docker secret ls`
2. Verify secret name matches: `docker secret inspect production_jwt_secret`
3. Check service has secret mapped:
   ```yaml
   services:
     backend:
       secrets:
         - jwt_secret
   ```

### Service Won't Start

**Error**: `Failed to read secret from file /run/secrets/database_url`

**Solution**:
1. Check secret is external: `external: true` in docker-compose
2. Verify file permissions: `ls -la /run/secrets/` inside container
3. Check secret content: `docker secret inspect --pretty production_database_url`

### Invalid Secret Value

**Error**: `DATABASE_URL validation failed`

**Solution**:
1. Remove secret: `docker secret rm production_database_url`
2. Recreate with correct format:
   ```bash
   echo "postgresql://user:pass@host:5432/db" | docker secret create production_database_url -
   ```
3. Redeploy stack

### Rotation Failed

**Error**: Service unhealthy after rotation

**Solution**:
1. **Rollback** to previous secret version
2. Check logs: `docker service logs syncwatch-production_backend`
3. Verify new secret format matches old one
4. Try rotation again with correct value

## Security Checklist

### Before Deploying to Production

- [ ] All secrets created via Docker Secrets (no `.env` file)
- [ ] No secrets in Git history: `git log -p | grep -i password`
- [ ] Strong passwords (minimum 32 characters for JWT secrets)
- [ ] TLS certificates configured and valid
- [ ] CORS origins restricted to actual domain
- [ ] Rate limiting enabled
- [ ] Database connections use SSL
- [ ] Audit logging enabled
- [ ] Monitoring and alerting configured

### Regular Maintenance

- [ ] Rotate TURN secret weekly
- [ ] Rotate JWT secrets monthly
- [ ] Rotate database passwords quarterly
- [ ] Review audit logs monthly
- [ ] Update dependencies quarterly
- [ ] Review GitHub secret access logs monthly
- [ ] Test disaster recovery annually

## Additional Resources

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [12-Factor App: Config](https://12factor.net/config)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

## Support

For issues or questions:
- Open an issue on GitHub
- Contact DevOps team
- See `docs/TECHNICAL_SPECIFICATION.md` Section 9.3-9.4
