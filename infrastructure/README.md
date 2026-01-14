# SyncWatch Infrastructure

This directory contains Terraform configuration for provisioning SyncWatch infrastructure on DigitalOcean.

## Quick Start

```bash
# Set required environment variables
export DIGITALOCEAN_TOKEN="your-do-token"
export TF_VAR_turn_secret="$(openssl rand -base64 32)"

# Provision staging environment
./scripts/provision.sh staging plan
./scripts/provision.sh staging apply

# Get outputs
./scripts/provision.sh staging output
```

## Documentation

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for complete deployment guide.

## Structure

```
infrastructure/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── versions.tf          # Provider versions
├── environments/        # Environment-specific configurations
├── modules/            # Reusable modules
└── scripts/            # Provisioning scripts
```

## Modules

- **database/** - PostgreSQL and Redis clusters
- **kubernetes/** - Kubernetes cluster configuration
- **turn/** - TURN server for WebRTC

## Environments

- **staging** - Development/testing environment
- **production** - Production environment

## Requirements

- Terraform >= 1.6
- DigitalOcean account and API token
- AWS account (optional, for S3 state backend)
