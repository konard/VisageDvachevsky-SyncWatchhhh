# Output values for infrastructure components

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = digitalocean_vpc.main.id
}

output "vpc_urn" {
  description = "VPC URN"
  value       = digitalocean_vpc.main.urn
}

# Database Outputs
output "postgres_id" {
  description = "PostgreSQL cluster ID"
  value       = module.database.postgres_id
}

output "postgres_host" {
  description = "PostgreSQL host"
  value       = module.database.postgres_host
  sensitive   = true
}

output "postgres_port" {
  description = "PostgreSQL port"
  value       = module.database.postgres_port
}

output "postgres_database" {
  description = "PostgreSQL database name"
  value       = module.database.postgres_database
}

output "postgres_user" {
  description = "PostgreSQL user"
  value       = module.database.postgres_user
  sensitive   = true
}

output "postgres_password" {
  description = "PostgreSQL password"
  value       = module.database.postgres_password
  sensitive   = true
}

output "postgres_uri" {
  description = "PostgreSQL connection URI (private network)"
  value       = module.database.postgres_uri
  sensitive   = true
}

output "redis_id" {
  description = "Redis cluster ID"
  value       = module.database.redis_id
}

output "redis_host" {
  description = "Redis host"
  value       = module.database.redis_host
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.database.redis_port
}

output "redis_password" {
  description = "Redis password"
  value       = module.database.redis_password
  sensitive   = true
}

output "redis_uri" {
  description = "Redis connection URI (private network)"
  value       = module.database.redis_uri
  sensitive   = true
}

# Object Storage Outputs
output "spaces_bucket_name" {
  description = "Spaces bucket name"
  value       = digitalocean_spaces_bucket.media.name
}

output "spaces_bucket_domain" {
  description = "Spaces bucket domain"
  value       = digitalocean_spaces_bucket.media.bucket_domain_name
}

output "spaces_endpoint" {
  description = "Spaces endpoint URL"
  value       = "https://${var.spaces_region}.digitaloceanspaces.com"
}

# TURN Server Outputs
output "turn_server_id" {
  description = "TURN server droplet ID"
  value       = module.turn.server_id
}

output "turn_server_ip" {
  description = "TURN server public IP address"
  value       = module.turn.server_ip
}

output "turn_server_private_ip" {
  description = "TURN server private IP address"
  value       = module.turn.server_private_ip
}

# Kubernetes Outputs
output "k8s_cluster_id" {
  description = "Kubernetes cluster ID"
  value       = module.kubernetes.cluster_id
}

output "k8s_cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = module.kubernetes.cluster_endpoint
  sensitive   = true
}

output "k8s_cluster_name" {
  description = "Kubernetes cluster name"
  value       = module.kubernetes.cluster_name
}

output "k8s_kubeconfig" {
  description = "Kubernetes cluster kubeconfig"
  value       = module.kubernetes.kubeconfig
  sensitive   = true
}

# CDN Outputs
output "cdn_endpoint" {
  description = "CDN endpoint URL"
  value       = length(digitalocean_cdn.media) > 0 ? digitalocean_cdn.media[0].endpoint : ""
}

output "cdn_custom_domain" {
  description = "CDN custom domain"
  value       = var.cdn_custom_domain
}

# Environment Info
output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "region" {
  description = "Deployment region"
  value       = var.region
}
