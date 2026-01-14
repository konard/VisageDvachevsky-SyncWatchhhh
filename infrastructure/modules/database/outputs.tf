# Database Module Outputs

# PostgreSQL Outputs
output "postgres_id" {
  description = "PostgreSQL cluster ID"
  value       = digitalocean_database_cluster.postgres.id
}

output "postgres_urn" {
  description = "PostgreSQL cluster URN"
  value       = digitalocean_database_cluster.postgres.urn
}

output "postgres_host" {
  description = "PostgreSQL private host"
  value       = digitalocean_database_cluster.postgres.private_host
  sensitive   = true
}

output "postgres_port" {
  description = "PostgreSQL port"
  value       = digitalocean_database_cluster.postgres.port
}

output "postgres_database" {
  description = "PostgreSQL database name"
  value       = digitalocean_database_db.syncwatch.name
}

output "postgres_user" {
  description = "PostgreSQL user"
  value       = digitalocean_database_cluster.postgres.user
  sensitive   = true
}

output "postgres_password" {
  description = "PostgreSQL password"
  value       = digitalocean_database_cluster.postgres.password
  sensitive   = true
}

output "postgres_uri" {
  description = "PostgreSQL connection URI (private network)"
  value       = digitalocean_database_cluster.postgres.private_uri
  sensitive   = true
}

# Redis Outputs
output "redis_id" {
  description = "Redis cluster ID"
  value       = digitalocean_database_cluster.redis.id
}

output "redis_urn" {
  description = "Redis cluster URN"
  value       = digitalocean_database_cluster.redis.urn
}

output "redis_host" {
  description = "Redis private host"
  value       = digitalocean_database_cluster.redis.private_host
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = digitalocean_database_cluster.redis.port
}

output "redis_password" {
  description = "Redis password"
  value       = digitalocean_database_cluster.redis.password
  sensitive   = true
}

output "redis_uri" {
  description = "Redis connection URI (private network)"
  value       = digitalocean_database_cluster.redis.private_uri
  sensitive   = true
}
