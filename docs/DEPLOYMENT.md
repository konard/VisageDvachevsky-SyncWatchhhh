# SyncWatch Deployment Guide

This guide provides step-by-step instructions for deploying SyncWatch to production environments. It's intended for DevOps engineers and SREs.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Docker Compose Deployment](#docker-compose-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [CDN Configuration](#cdn-configuration)
8. [SSL/TLS Setup](#ssl-tls-setup)
9. [Monitoring & Logging](#monitoring--logging)
10. [Post-Deployment Verification](#post-deployment-verification)
11. [Rollback Procedures](#rollback-procedures)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Users                          │
└────────────────────┬────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │   CDN       │ (CloudFlare, CloudFront)
              │  (Static)   │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ Load Balancer│ (ALB, nginx)
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
  - PostgreSQL 15+ (managed service recommended: AWS RDS, GCP Cloud SQL)
  - 20GB storage minimum, auto-scaling enabled

- **Cache**:
  - Redis 7+ (managed service recommended: AWS ElastiCache, Redis Cloud)
  - 2GB memory minimum

- **Storage**:
  - S3-compatible object storage (AWS S3, MinIO, DigitalOcean Spaces)
  - 100GB minimum, lifecycle policies configured

- **Load Balancer**:
  - Application Load Balancer (AWS ALB) or nginx
  - WebSocket support required

### Required Tools

```bash
# Install on deployment machine
- Docker 24+
- Docker Compose 2.20+
- kubectl 1.28+ (for Kubernetes)
- Terraform 1.5+ (for IaC)
- AWS CLI / gcloud / doctl (cloud provider CLI)
```

### Domain & DNS

- Domain name configured
- DNS records pointed to load balancer
- SSL certificate obtained (Let's Encrypt or AWS ACM)

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

**Using Terraform:**
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

## Docker Compose Deployment

### 1. Production docker-compose.yml

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

### 2. Build & Deploy

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

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace syncwatch-production
kubectl config set-context --current --namespace=syncwatch-production
```

### 2. Apply Secrets

```bash
# Create secrets from .env
kubectl create secret generic syncwatch-secrets \
  --from-env-file=.env.production

# Or from literal values
kubectl create secret generic syncwatch-secrets \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --from-literal=database-url="postgresql://..."
```

### 3. Deploy Backend

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

### 4. Deploy Frontend

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

### 5. Configure Ingress

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

## Troubleshooting

See [RUNBOOKS.md](RUNBOOKS.md) for detailed troubleshooting guides.

**Common Issues:**

- **Database connection timeout**: Check security groups, network ACLs
- **502 Bad Gateway**: Check backend health, increase timeout
- **WebSocket connection fails**: Verify load balancer supports WebSocket
- **High memory usage**: Check for memory leaks, increase limits

---

For day-to-day operations, see [OPERATIONS.md](OPERATIONS.md).
For incident response, see [INCIDENTS.md](INCIDENTS.md).
