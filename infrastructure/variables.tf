variable "environment" {
  description = "Deployment environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "region" {
  description = "DigitalOcean region for deployment"
  type        = string
  default     = "nyc3"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "syncwatch"
}

# VPC Configuration
variable "vpc_ip_range" {
  description = "IP range for the VPC"
  type        = string
  default     = "10.10.0.0/16"
}

# Database Configuration
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "postgres_size" {
  description = "PostgreSQL droplet size"
  type        = string
  default     = "db-s-2vcpu-4gb"
}

variable "postgres_node_count" {
  description = "Number of PostgreSQL nodes (1 for staging, 2+ for production)"
  type        = number
  default     = 1
  validation {
    condition     = var.postgres_node_count >= 1
    error_message = "PostgreSQL node count must be at least 1."
  }
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7"
}

variable "redis_size" {
  description = "Redis droplet size"
  type        = string
  default     = "db-s-1vcpu-2gb"
}

variable "redis_node_count" {
  description = "Number of Redis nodes"
  type        = number
  default     = 1
}

# Object Storage Configuration
variable "spaces_region" {
  description = "DigitalOcean Spaces region"
  type        = string
  default     = "nyc3"
}

variable "spaces_acl" {
  description = "ACL for Spaces bucket"
  type        = string
  default     = "private"
}

variable "allowed_origins" {
  description = "Allowed CORS origins for Spaces bucket"
  type        = list(string)
  default     = ["*"]
}

# TURN Server Configuration
variable "turn_server_image" {
  description = "Ubuntu image for TURN server"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "turn_server_size" {
  description = "TURN server droplet size"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "turn_secret" {
  description = "Shared secret for TURN server authentication"
  type        = string
  sensitive   = true
}

variable "turn_realm" {
  description = "Realm for TURN server"
  type        = string
  default     = "syncwatch.example"
}

# Kubernetes Configuration
variable "k8s_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.29.0-do.0"
}

variable "k8s_node_size" {
  description = "Kubernetes node droplet size"
  type        = string
  default     = "s-4vcpu-8gb"
}

variable "k8s_min_nodes" {
  description = "Minimum number of Kubernetes nodes"
  type        = number
  default     = 2
}

variable "k8s_max_nodes" {
  description = "Maximum number of Kubernetes nodes"
  type        = number
  default     = 10
}

# CDN Configuration
variable "cdn_custom_domain" {
  description = "Custom domain for CDN"
  type        = string
  default     = ""
}

variable "cdn_certificate_id" {
  description = "DigitalOcean certificate ID for CDN"
  type        = string
  default     = ""
}

# Tags
variable "tags" {
  description = "Tags to apply to all resources"
  type        = list(string)
  default     = []
}
