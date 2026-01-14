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
This guide provides comprehensive instructions for deploying SyncWatch to production environments. It covers both infrastructure provisioning (using Terraform) and application deployment procedures.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Provisioning (Terraform)](#infrastructure-provisioning-terraform)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [Deployment Methods](#deployment-methods)
   - [Docker Compose](#docker-compose-deployment)
   - [Kubernetes](#kubernetes-deployment)
7. [CDN Configuration](#cdn-configuration)
8. [SSL/TLS Setup](#ssltls-setup)
9. [Monitoring & Logging](#monitoring--logging)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Troubleshooting](#troubleshooting)
12. [Disaster Recovery](#disaster-recovery)
13. [Rollback Procedures](#rollback-procedures)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Users                          │
└────────────────────┬────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │   CDN       │ (CloudFlare, CloudFront, DO CDN)
              │  (Static)   │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ Load Balancer│ (ALB, nginx, K8s Ingress)
              │   + TLS      │
              └──┬────────┬──┘
                 │        │
        ┌────────▼──┐  ┌──▼─────────┐
        │  Frontend │  │   Backend  │
        │  (nginx)  │  │  (Node.js) │
        └───────────┘  └──┬────┬────┘
                          │    │
         ┌────────────────┼────┼──────────────────┐
         │                │    │                  │
    ┌────▼────┐   ┌──────▼───┐  ┌───────▼────┐  │
    │PostgreSQL│   │   Redis  │  │ MinIO/S3   │  │
    │  (RDS)   │   │(ElastiCache)│(Storage)   │  │
    └──────────┘   └──────────┘  └────────────┘  │
                                                  │
                                         ┌────────▼────────┐
                                         │  Transcoder     │
                                         │   (FFmpeg)      │
                                         └─────────────────┘
```

---

## Prerequisites

### Infrastructure

- **Compute**:
  - Backend: 2 vCPU, 4GB RAM (minimum)
  - Frontend: 1 vCPU, 1GB RAM
  - Transcoder: 4 vCPU, 8GB RAM (per worker)

- **Database**:
  - PostgreSQL 15+ (managed service recommended: AWS RDS, GCP Cloud SQL, DigitalOcean)
  - 20GB storage minimum, auto-scaling enabled

- **Cache**:
  - Redis 7+ (managed service recommended: AWS ElastiCache, Redis Cloud, DigitalOcean)
  - 2GB memory minimum

- **Storage**:
  - S3-compatible object storage (AWS S3, MinIO, DigitalOcean Spaces)
  - 100GB minimum, lifecycle policies configured

- **Load Balancer**:
  - Application Load Balancer (AWS ALB) or nginx or K8s Ingress
  - WebSocket support required

### Required Tools

```bash
# For Terraform Infrastructure as Code
- Terraform >= 1.6
- DigitalOcean CLI (doctl) - if using DigitalOcean

# For Application Deployment
- Docker 24+
- Docker Compose 2.20+
- kubectl 1.28+ (for Kubernetes)
- AWS CLI / gcloud / doctl (cloud provider CLI)
- git
```

### Domain & DNS

- Domain name configured
- DNS records pointed to load balancer
- SSL certificate obtained (Let's Encrypt or AWS ACM)

### Required Credentials

- DigitalOcean API Token (with read/write permissions) - if using DigitalOcean
- AWS credentials (for S3 state backend, optional)
- TURN server shared secret

### Environment Variables for Terraform

```bash
export DIGITALOCEAN_TOKEN="your-do-token"
export TF_VAR_turn_secret="your-turn-secret"  # Generate with: openssl rand -base64 32

# Optional: For S3 remote state backend
export AWS_ACCESS_KEY_ID="your-aws-access-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

---

## Infrastructure Provisioning (Terraform)

SyncWatch uses Terraform for Infrastructure as Code (IaC). All infrastructure is defined in the `infrastructure/` directory.

### Project Structure
```
infrastructure/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── versions.tf          # Provider versions
├── environments/
│   ├── staging.tfvars   # Staging configuration
│   └── production.tfvars # Production configuration
├── modules/
│   ├── database/        # PostgreSQL & Redis
│   ├── kubernetes/      # Kubernetes cluster
│   └── turn/            # TURN server
└── scripts/
    ├── provision.sh     # Provisioning script
    └── validate.sh      # Validation script
```

### Infrastructure Components

| Component | Provider | Purpose |
|-----------|----------|---------|
| VPC | DigitalOcean | Isolated network |
| PostgreSQL | DigitalOcean | Primary database (HA in production) |
| Redis | DigitalOcean | Caching & session storage |
| Object Storage | DigitalOcean Spaces | Media file storage |
| TURN Server | DigitalOcean Droplet | WebRTC relay |
| Kubernetes | DigitalOcean DOKS | Container orchestration |
| CDN | DigitalOcean CDN | Content delivery (production only) |

### Initial Setup

#### 1. Clone Repository
```bash
git clone https://github.com/VisageDvachevsky/SyncWatchhhh.git
cd SyncWatchhhh/infrastructure
```

#### 2. Configure Remote State (Recommended)
Create an S3 bucket for Terraform state:
```bash
# Create S3 bucket (AWS)
aws s3api create-bucket \
    --bucket syncwatch-terraform-state \
    --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket syncwatch-terraform-state \
    --versioning-configuration Status=Enabled
```

#### 3. Review Configuration
Edit environment-specific configurations:
- `environments/staging.tfvars` - Staging environment
- `environments/production.tfvars` - Production environment

### Environment Configuration

#### Staging Environment
```hcl
# environments/staging.tfvars
environment = "staging"
region      = "nyc3"

postgres_node_count = 1      # Single node
k8s_min_nodes      = 1       # Minimal cluster
k8s_max_nodes      = 3

# CDN disabled for staging
cdn_custom_domain  = ""
```

#### Production Environment
```hcl
# environments/production.tfvars
environment = "production"
region      = "nyc3"

postgres_node_count = 2      # High availability
k8s_min_nodes      = 2       # Redundancy
k8s_max_nodes      = 10      # Auto-scaling

cdn_custom_domain  = "cdn.syncwatch.example"
```

### Provisioning Process

#### Using the Provisioning Script (Recommended)

##### 1. Plan Infrastructure
```bash
# Staging
./scripts/provision.sh staging plan

# Production
./scripts/provision.sh production plan
```

##### 2. Review Changes
Carefully review the Terraform plan output to ensure:
- Correct resources are being created
- No unexpected deletions
- Resource counts match expectations

##### 3. Apply Infrastructure
```bash
# Staging
./scripts/provision.sh staging apply

# Production (requires manual confirmation)
./scripts/provision.sh production apply
```

##### 4. View Outputs
```bash
# Get infrastructure details
./scripts/provision.sh staging output

# Outputs are saved to outputs-<environment>.json
cat outputs-staging.json | jq
```

#### Manual Terraform Commands

If you prefer to run Terraform directly:

```bash
# Initialize
terraform init \
    -backend-config="bucket=syncwatch-terraform-state" \
    -backend-config="key=staging/terraform.tfstate" \
    -backend-config="region=us-east-1"

# Plan
terraform plan -var-file=environments/staging.tfvars -out=tfplan

# Apply
terraform apply tfplan

# Output
terraform output -json > outputs.json
```

### Post-Provisioning Steps

#### 1. Configure Kubernetes
```bash
# Save kubeconfig
export KUBECONFIG=./kubeconfig-staging.yaml

# Deploy application namespaces
kubectl create namespace syncwatch-staging
kubectl create namespace syncwatch-monitoring
```

#### 2. Configure Database
```bash
# Get database credentials
DB_URI=$(terraform output -json | jq -r '.postgres_uri.value')

# Connect to database
psql "$DB_URI"

# Run migrations (from backend directory)
cd ../backend
npm run migrate:up
```

#### 3. Upload Secrets to Kubernetes
```bash
# Create database secret
kubectl create secret generic database-credentials \
    --from-literal=uri="$DB_URI" \
    -n syncwatch-staging

# Create Redis secret
REDIS_URI=$(terraform output -json | jq -r '.redis_uri.value')
kubectl create secret generic redis-credentials \
    --from-literal=uri="$REDIS_URI" \
    -n syncwatch-staging

# Create TURN secret
kubectl create secret generic turn-credentials \
    --from-literal=secret="$TF_VAR_turn_secret" \
    -n syncwatch-staging
```

### Infrastructure Verification

#### 1. Verify VPC
```bash
doctl vpcs list
```

#### 2. Verify Databases
```bash
# PostgreSQL
doctl databases list | grep postgres

# Redis
doctl databases list | grep redis
```

#### 3. Verify Kubernetes
```bash
# Get cluster credentials
doctl kubernetes cluster kubeconfig save <cluster-id>

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

#### 4. Verify TURN Server
```bash
# Get TURN server IP
terraform output turn_server_ip

# Test TURN server (from your local machine)
# Install coturn-utils: apt-get install coturn-utils
turnutils_uclient -v -u test -w test <turn-server-ip> 3478
```

#### 5. Verify Object Storage
```bash
doctl compute spaces list
```

---

## Environment Setup

### 1. Create Environment File

```bash
# Create production .env from template
cp backend/.env.example backend/.env.production

# Edit with production values
nano backend/.env.production
```

### 2. Set Required Variables

See [ENVIRONMENT.md](../ENVIRONMENT.md) for full reference.

**Critical Production Settings:**

```bash
# Server
NODE_ENV=production
PORT=4000

# Database (use managed service)
DATABASE_URL="postgresql://user:pass@db.example.com:5432/syncwatch?sslmode=require"

# Redis (use managed service)
REDIS_URL="rediss://:password@redis.example.com:6380/0"

# S3 Storage
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=${AWS_ACCESS_KEY_ID}
MINIO_SECRET_KEY=${AWS_SECRET_ACCESS_KEY}
MINIO_BUCKET=syncwatch-production-videos

# JWT (generate secure random string)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://syncwatch.com

# Limits
MAX_UPLOAD_SIZE=8589934592  # 8GB
MAX_VIDEO_DURATION=10800    # 3 hours
```

### 3. Secrets Management

**AWS Secrets Manager:**
```bash
# Store secrets
aws secretsmanager create-secret \
  --name syncwatch/production/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name syncwatch/production/database-url \
  --secret-string "postgresql://..."

# Retrieve in deployment
JWT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id syncwatch/production/jwt-secret \
  --query SecretString --output text)
```

**HashiCorp Vault:**
```bash
# Write secrets
vault kv put secret/syncwatch/production \
  jwt_secret="..." \
  database_url="..."

# Read in deployment
vault kv get -field=jwt_secret secret/syncwatch/production
```

---

## Database Setup

### 1. Provision PostgreSQL

If not using Terraform, provision PostgreSQL manually:

**AWS RDS:**
```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier syncwatch-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username syncwatch \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --multi-az
```

**Using Terraform (alternative):**
```hcl
resource "aws_db_instance" "syncwatch" {
  identifier             = "syncwatch-production"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.medium"
  allocated_storage      = 20
  storage_encrypted      = true
  db_name                = "syncwatch"
  username               = "syncwatch"
  password               = var.db_password
  backup_retention_period = 7
  multi_az               = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "syncwatch-final-snapshot"
}
```

### 2. Run Database Migrations

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@db.example.com:5432/syncwatch?sslmode=require"

# Run migrations
cd backend
npm install
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 3. Configure Connection Pooling

**PgBouncer (recommended for serverless):**
```ini
[databases]
syncwatch = host=db.example.com port=5432 dbname=syncwatch

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

---

## Deployment Methods

### Docker Compose Deployment

#### 1. Production docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    image: syncwatch/backend:${VERSION:-latest}
    restart: always
    env_file: .env.production
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: syncwatch/frontend:${VERSION:-latest}
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro

  transcoder:
    image: syncwatch/transcoder:${VERSION:-latest}
    restart: always
    env_file: .env.production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '4'
          memory: 8G

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: syncwatch
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: syncwatch
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U syncwatch"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

#### 2. Build & Deploy

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Tag images
docker tag syncwatch/backend:latest syncwatch/backend:v1.0.0
docker tag syncwatch/frontend:latest syncwatch/frontend:v1.0.0

# Push to registry
docker push syncwatch/backend:v1.0.0
docker push syncwatch/frontend:v1.0.0

# Deploy
VERSION=v1.0.0 docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

---

### Kubernetes Deployment

#### 1. Create Namespace

```bash
kubectl create namespace syncwatch-production
kubectl config set-context --current --namespace=syncwatch-production
```

#### 2. Apply Secrets

```bash
# Create secrets from .env
kubectl create secret generic syncwatch-secrets \
  --from-env-file=.env.production

# Or from literal values
kubectl create secret generic syncwatch-secrets \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --from-literal=database-url="postgresql://..."
```

#### 3. Deploy Backend

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: syncwatch-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: syncwatch-backend
  template:
    metadata:
      labels:
        app: syncwatch-backend
    spec:
      containers:
      - name: backend
        image: syncwatch/backend:v1.0.0
        ports:
        - containerPort: 4000
        envFrom:
        - secretRef:
            name: syncwatch-secrets
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: syncwatch-backend
spec:
  type: ClusterIP
  selector:
    app: syncwatch-backend
  ports:
  - port: 4000
    targetPort: 4000
```

```bash
kubectl apply -f backend-deployment.yaml
```

#### 4. Deploy Frontend

**frontend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: syncwatch-frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: syncwatch-frontend
  template:
    metadata:
      labels:
        app: syncwatch-frontend
    spec:
      containers:
      - name: frontend
        image: syncwatch/frontend:v1.0.0
        ports:
        - containerPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: syncwatch-frontend
spec:
  type: LoadBalancer
  selector:
    app: syncwatch-frontend
  ports:
  - port: 80
    targetPort: 80
  - port: 443
    targetPort: 443
```

```bash
kubectl apply -f frontend-deployment.yaml
```

#### 5. Configure Ingress

**ingress.yaml:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: syncwatch-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/websocket-services: syncwatch-backend
spec:
  tls:
  - hosts:
    - syncwatch.com
    - api.syncwatch.com
    secretName: syncwatch-tls
  rules:
  - host: syncwatch.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: syncwatch-frontend
            port:
              number: 80
  - host: api.syncwatch.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: syncwatch-backend
            port:
              number: 4000
```

```bash
kubectl apply -f ingress.yaml
```

---

## CDN Configuration

### CloudFlare

```bash
# 1. Add domain to CloudFlare
# 2. Update nameservers at registrar
# 3. Enable proxy (orange cloud) for:
#    - syncwatch.com (frontend)
#    - cdn.syncwatch.com (static assets)

# 4. Configure caching rules
# Page Rule: cdn.syncwatch.com/*
#   - Cache Level: Cache Everything
#   - Edge Cache TTL: 1 month
#   - Browser Cache TTL: 4 hours
```

### AWS CloudFront

```bash
# Create distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json

# cloudfront-config.json
{
  "Origins": [{
    "Id": "S3-syncwatch-static",
    "DomainName": "syncwatch-static.s3.amazonaws.com",
    "S3OriginConfig": {
      "OriginAccessIdentity": ""
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-syncwatch-static",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }
}
```

---

## SSL/TLS Setup

### Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d syncwatch.com -d www.syncwatch.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

### AWS Certificate Manager

```bash
# Request certificate
aws acm request-certificate \
  --domain-name syncwatch.com \
  --subject-alternative-names www.syncwatch.com api.syncwatch.com \
  --validation-method DNS

# Get validation records
aws acm describe-certificate --certificate-arn <arn>

# Add CNAME records to DNS (validation)
```

---

## Monitoring & Logging

See [OPERATIONS.md](OPERATIONS.md) for detailed monitoring setup.

### Quick Setup

**Prometheus + Grafana:**
```bash
# Deploy monitoring stack
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/kube-prometheus/main/manifests/setup/
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/kube-prometheus/main/manifests/
```

**CloudWatch (AWS):**
```bash
# Enable container insights
eksctl utils update-cluster-logging \
  --cluster=syncwatch-production \
  --enable-types all
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health
curl https://api.syncwatch.com/health
# Expected: {"status": "ok"}

# Database connection
curl https://api.syncwatch.com/health/ready
# Expected: {"status": "ready", "database": "connected"}
```

### 2. Functionality Tests

```bash
# Register user
curl -X POST https://api.syncwatch.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test123!"}'

# Create room
curl -X POST https://api.syncwatch.com/api/rooms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room"}'
```

### 3. Performance Tests

```bash
# Load test with Apache Bench
ab -n 1000 -c 100 https://api.syncwatch.com/health

# WebSocket load test
npx artillery run load-test.yaml
```

---

## Troubleshooting

### Terraform-Related Issues

#### 1. Terraform State Lock
```bash
# If state is locked, force unlock (use with caution)
terraform force-unlock <lock-id>
```

#### 2. DigitalOcean API Rate Limits
```bash
# Wait and retry, or use smaller batch sizes
terraform apply -parallelism=5
```

#### 3. Kubernetes Cluster Not Ready
```bash
# Check cluster status
doctl kubernetes cluster get <cluster-id>

# Wait for cluster to be ready
doctl kubernetes cluster kubeconfig save <cluster-id> --wait
```

#### 4. TURN Server Not Accessible
```bash
# Check droplet status
doctl compute droplet list | grep turn

# Check firewall rules
doctl compute firewall list

# SSH to TURN server (from VPC)
ssh root@<turn-private-ip>
systemctl status coturn
```

### Application Issues

See [RUNBOOKS.md](RUNBOOKS.md) for detailed troubleshooting guides.

**Common Issues:**

- **Database connection timeout**: Check security groups, network ACLs, VPC configuration
- **502 Bad Gateway**: Check backend health, increase timeout, verify service is running
- **WebSocket connection fails**: Verify load balancer supports WebSocket
- **High memory usage**: Check for memory leaks, increase limits

### Logs and Debugging

#### View Terraform Logs
```bash
export TF_LOG=DEBUG
terraform apply
```

#### Check TURN Server Logs
```bash
# SSH to TURN server
ssh root@<turn-server-ip>

# View coturn logs
tail -f /var/log/turnserver.log

# Check health
/usr/local/bin/turn-health-check.sh
```

---

## Disaster Recovery

### Terraform State Backup
```bash
# Backup Terraform state
terraform state pull > terraform-state-backup-$(date +%Y%m%d).json

# Upload to secure location
aws s3 cp terraform-state-backup-*.json s3://syncwatch-backups/terraform/
```

### Restore from Backup
```bash
# Download backup
aws s3 cp s3://syncwatch-backups/terraform/terraform-state-backup-<date>.json ./

# Push to Terraform
terraform state push terraform-state-backup-<date>.json
```

### Disaster Recovery Plan
1. **Database**: Managed by DigitalOcean with automatic backups (30 days retention in production)
2. **Object Storage**: Enable versioning (enabled in production)
3. **Kubernetes**: State stored in etcd, managed by DigitalOcean
4. **Terraform State**: Versioned in S3 bucket

---

## Rollback Procedures

### Docker Compose

```bash
# Rollback to previous version
VERSION=v0.9.0 docker compose -f docker-compose.prod.yml up -d

# Or use latest backup
docker compose -f docker-compose.prod.yml down
docker volume create --name postgres_data_backup
# ... restore from backup
docker compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/syncwatch-backend

# Rollback to specific revision
kubectl rollout undo deployment/syncwatch-backend --to-revision=2

# Check rollout status
kubectl rollout status deployment/syncwatch-backend
```

---

## Destroying Infrastructure

⚠️ **WARNING**: This will permanently delete all resources!

```bash
# Staging
./scripts/provision.sh staging destroy

# Production (requires typing exact confirmation)
./scripts/provision.sh production destroy
```

---

## Environment Differences

| Feature | Staging | Production |
|---------|---------|------------|
| PostgreSQL Nodes | 1 | 2 (HA) |
| PostgreSQL Size | db-s-2vcpu-4gb | db-s-4vcpu-8gb |
| Redis Size | db-s-1vcpu-2gb | db-s-2vcpu-4gb |
| K8s Min Nodes | 1 | 2 |
| K8s Max Nodes | 3 | 10 |
| K8s Node Size | s-2vcpu-4gb | s-4vcpu-8gb |
| TURN Server Size | s-1vcpu-2gb | s-2vcpu-4gb |
| CDN | Disabled | Enabled |
| Backups | 7 days | 30 days |
| Auto-shutdown | Enabled | Disabled |

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables or secret managers
2. **Use S3 remote state** - Enable versioning and encryption
3. **Enable audit logging** - Track all infrastructure changes
4. **Restrict access** - Use IAM roles and least privilege
5. **Regular updates** - Keep Terraform and providers up to date
6. **Review plans** - Always review before applying changes
7. **Use VPC** - All resources communicate over private network
8. **Firewall rules** - Restrict access to necessary ports only

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/VisageDvachevsky/SyncWatchhhh/issues
- Technical Specification: `docs/TECHNICAL_SPECIFICATION.md`
- Architecture: `docs/ARCHITECTURE.md`
- Operations Guide: `docs/OPERATIONS.md`
- Incident Response: `docs/INCIDENTS.md`

---

*Last updated: 2026-01-14*
