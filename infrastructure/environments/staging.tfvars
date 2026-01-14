# Staging Environment Configuration

environment = "staging"
region      = "nyc3"

# VPC
vpc_ip_range = "10.10.0.0/16"

# Database Configuration
postgres_version    = "15"
postgres_size       = "db-s-2vcpu-4gb"
postgres_node_count = 1  # Single node for staging

redis_version    = "7"
redis_size       = "db-s-1vcpu-2gb"
redis_node_count = 1

# Object Storage
spaces_region = "nyc3"
spaces_acl    = "private"
allowed_origins = [
  "https://staging.syncwatch.example",
  "http://localhost:3000"  # For development testing
]

# TURN Server
turn_server_image = "ubuntu-22-04-x64"
turn_server_size  = "s-1vcpu-2gb"  # Smaller for staging
turn_realm        = "staging.syncwatch.example"

# Kubernetes
k8s_version  = "1.29.0-do.0"
k8s_node_size = "s-2vcpu-4gb"  # Smaller nodes for staging
k8s_min_nodes = 1
k8s_max_nodes = 3

# CDN - disabled for staging
cdn_custom_domain  = ""
cdn_certificate_id = ""

# Tags
tags = [
  "cost-center:staging",
  "auto-shutdown:enabled"
]
