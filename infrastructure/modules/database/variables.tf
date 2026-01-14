# Database Module Variables

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
}

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for private networking"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = list(string)
}

# PostgreSQL
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
}

variable "postgres_size" {
  description = "PostgreSQL droplet size"
  type        = string
}

variable "postgres_node_count" {
  description = "Number of PostgreSQL nodes"
  type        = number
}

# Redis
variable "redis_version" {
  description = "Redis version"
  type        = string
}

variable "redis_size" {
  description = "Redis droplet size"
  type        = string
}

variable "redis_node_count" {
  description = "Number of Redis nodes"
  type        = number
}
