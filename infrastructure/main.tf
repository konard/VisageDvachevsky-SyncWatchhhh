# Main Terraform configuration for SyncWatch infrastructure

# Local variables
locals {
  common_tags = concat(
    [
      "project:${var.project_name}",
      "environment:${var.environment}",
      "managed-by:terraform"
    ],
    var.tags
  )
  name_prefix = "${var.project_name}-${var.environment}"
}

# VPC - Isolated network for all resources
resource "digitalocean_vpc" "main" {
  name     = "${local.name_prefix}-vpc"
  region   = var.region
  ip_range = var.vpc_ip_range

  description = "VPC for ${var.project_name} ${var.environment} environment"
}

# Database Module - PostgreSQL and Redis clusters
module "database" {
  source = "./modules/database"

  environment  = var.environment
  region       = var.region
  name_prefix  = local.name_prefix
  vpc_id       = digitalocean_vpc.main.id
  common_tags  = local.common_tags

  # PostgreSQL
  postgres_version    = var.postgres_version
  postgres_size       = var.postgres_size
  postgres_node_count = var.postgres_node_count

  # Redis
  redis_version    = var.redis_version
  redis_size       = var.redis_size
  redis_node_count = var.redis_node_count
}

# Object Storage (Spaces) - Media file storage
resource "digitalocean_spaces_bucket" "media" {
  name   = "${local.name_prefix}-media"
  region = var.spaces_region
  acl    = var.spaces_acl

  cors_rule {
    allowed_origins = var.allowed_origins
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    id      = "cleanup-incomplete-uploads"
    enabled = true

    abort_incomplete_multipart_upload_days = 7
  }

  versioning {
    enabled = var.environment == "production"
  }
}

# TURN Server Module - WebRTC relay server
module "turn" {
  source = "./modules/turn"

  environment = var.environment
  region      = var.region
  name_prefix = local.name_prefix
  vpc_id      = digitalocean_vpc.main.id
  common_tags = local.common_tags

  server_image = var.turn_server_image
  server_size  = var.turn_server_size
  turn_secret  = var.turn_secret
  turn_realm   = var.turn_realm
}

# Kubernetes Module - Container orchestration
module "kubernetes" {
  source = "./modules/kubernetes"

  environment = var.environment
  region      = var.region
  name_prefix = local.name_prefix
  vpc_id      = digitalocean_vpc.main.id
  common_tags = local.common_tags

  k8s_version  = var.k8s_version
  node_size    = var.k8s_node_size
  min_nodes    = var.k8s_min_nodes
  max_nodes    = var.k8s_max_nodes
}

# CDN - Content delivery network for media files
resource "digitalocean_cdn" "media" {
  count = var.cdn_custom_domain != "" && var.cdn_certificate_id != "" ? 1 : 0

  origin         = digitalocean_spaces_bucket.media.bucket_domain_name
  custom_domain  = var.cdn_custom_domain
  certificate_id = var.cdn_certificate_id

  ttl = 3600
}
