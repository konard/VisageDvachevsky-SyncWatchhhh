# SyncWatch Deployment Guide

This guide covers the infrastructure provisioning and deployment procedures for SyncWatch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Provisioning](#infrastructure-provisioning)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Process](#deployment-process)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Disaster Recovery](#disaster-recovery)

---

## Prerequisites

### Required Tools
- Terraform >= 1.6
- DigitalOcean CLI (`doctl`)
- kubectl
- git

### Required Credentials
- DigitalOcean API Token (with read/write permissions)
- AWS credentials (for S3 state backend, optional)
- TURN server shared secret

### Environment Variables
```bash
export DIGITALOCEAN_TOKEN="your-do-token"
export TF_VAR_turn_secret="your-turn-secret"  # Generate with: openssl rand -base64 32

# Optional: For S3 remote state backend
export AWS_ACCESS_KEY_ID="your-aws-access-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

---

## Infrastructure Provisioning

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
    └── provision.sh     # Provisioning script
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

---

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/VisageDvachevsky/SyncWatchhhh.git
cd SyncWatchhhh/infrastructure
```

### 2. Configure Remote State (Recommended)
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

### 3. Review Configuration
Edit environment-specific configurations:
- `environments/staging.tfvars` - Staging environment
- `environments/production.tfvars` - Production environment

---

## Environment Configuration

### Staging Environment
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

### Production Environment
```hcl
# environments/production.tfvars
environment = "production"
region      = "nyc3"

postgres_node_count = 2      # High availability
k8s_min_nodes      = 2       # Redundancy
k8s_max_nodes      = 10      # Auto-scaling

cdn_custom_domain  = "cdn.syncwatch.example"
```

---

## Deployment Process

### Using the Provisioning Script (Recommended)

#### 1. Plan Infrastructure
```bash
# Staging
./scripts/provision.sh staging plan

# Production
./scripts/provision.sh production plan
```

#### 2. Review Changes
Carefully review the Terraform plan output to ensure:
- Correct resources are being created
- No unexpected deletions
- Resource counts match expectations

#### 3. Apply Infrastructure
```bash
# Staging
./scripts/provision.sh staging apply

# Production (requires manual confirmation)
./scripts/provision.sh production apply
```

#### 4. View Outputs
```bash
# Get infrastructure details
./scripts/provision.sh staging output

# Outputs are saved to outputs-<environment>.json
cat outputs-staging.json | jq
```

### Manual Terraform Commands

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

---

## Verification

### 1. Verify VPC
```bash
doctl vpcs list
```

### 2. Verify Databases
```bash
# PostgreSQL
doctl databases list | grep postgres

# Redis
doctl databases list | grep redis
```

### 3. Verify Kubernetes
```bash
# Get cluster credentials
doctl kubernetes cluster kubeconfig save <cluster-id>

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### 4. Verify TURN Server
```bash
# Get TURN server IP
terraform output turn_server_ip

# Test TURN server (from your local machine)
# Install coturn-utils: apt-get install coturn-utils
turnutils_uclient -v -u test -w test <turn-server-ip> 3478
```

### 5. Verify Object Storage
```bash
doctl compute spaces list
```

---

## Post-Provisioning Steps

### 1. Configure Kubernetes
```bash
# Save kubeconfig
export KUBECONFIG=./kubeconfig-staging.yaml

# Deploy application namespaces
kubectl create namespace syncwatch-staging
kubectl create namespace syncwatch-monitoring
```

### 2. Configure Database
```bash
# Get database credentials
DB_URI=$(terraform output -json | jq -r '.postgres_uri.value')

# Connect to database
psql "$DB_URI"

# Run migrations (from backend directory)
cd ../backend
npm run migrate:up
```

### 3. Upload Secrets to Kubernetes
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

---

## Troubleshooting

### Common Issues

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

### Backup State
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
1. **Database**: Managed by DigitalOcean with automatic backups (30 days retention)
2. **Object Storage**: Enable versioning (enabled in production)
3. **Kubernetes**: State stored in etcd, managed by DigitalOcean
4. **Terraform State**: Versioned in S3 bucket

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

---

*Last updated: 2026-01-14*
