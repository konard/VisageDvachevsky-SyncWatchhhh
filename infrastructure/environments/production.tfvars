# Production Environment Configuration

environment = "production"
region      = "nyc3"

# VPC
vpc_ip_range = "10.10.0.0/16"

# Database Configuration
postgres_version    = "15"
postgres_size       = "db-s-4vcpu-8gb"
postgres_node_count = 2  # High availability

redis_version    = "7"
redis_size       = "db-s-2vcpu-4gb"
redis_node_count = 1

# Object Storage
spaces_region = "nyc3"
spaces_acl    = "private"
allowed_origins = [
  "https://syncwatch.example",
  "https://www.syncwatch.example"
]

# TURN Server
turn_server_image = "ubuntu-22-04-x64"
turn_server_size  = "s-2vcpu-4gb"
turn_realm        = "syncwatch.example"

# Kubernetes
k8s_version  = "1.29.0-do.0"
k8s_node_size = "s-4vcpu-8gb"
k8s_min_nodes = 2
k8s_max_nodes = 10

# CDN - configure with actual values when ready
cdn_custom_domain  = "cdn.syncwatch.example"
cdn_certificate_id = ""  # Set this to actual certificate ID

# Tags
tags = [
  "cost-center:production",
  "critical:true",
  "backup:enabled"
]
