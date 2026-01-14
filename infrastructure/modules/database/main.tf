# Database Module - PostgreSQL and Redis clusters

# PostgreSQL Database Cluster
resource "digitalocean_database_cluster" "postgres" {
  name       = "${var.name_prefix}-postgres"
  engine     = "pg"
  version    = var.postgres_version
  size       = var.postgres_size
  region     = var.region
  node_count = var.postgres_node_count

  private_network_uuid = var.vpc_id

  tags = concat(
    var.common_tags,
    ["database:postgresql"]
  )
}

# PostgreSQL Database
resource "digitalocean_database_db" "syncwatch" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "syncwatch"
}

# PostgreSQL Firewall - Only allow VPC traffic
resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "tag"
    value = "environment:${var.environment}"
  }
}

# Redis Database Cluster
resource "digitalocean_database_cluster" "redis" {
  name       = "${var.name_prefix}-redis"
  engine     = "redis"
  version    = var.redis_version
  size       = var.redis_size
  region     = var.region
  node_count = var.redis_node_count

  private_network_uuid = var.vpc_id

  eviction_policy = "allkeys-lru"

  tags = concat(
    var.common_tags,
    ["database:redis"]
  )
}

# Redis Firewall - Only allow VPC traffic
resource "digitalocean_database_firewall" "redis" {
  cluster_id = digitalocean_database_cluster.redis.id

  rule {
    type  = "tag"
    value = "environment:${var.environment}"
  }
}
