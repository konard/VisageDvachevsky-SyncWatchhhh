# TURN Server Module Variables

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

variable "vpc_ip_range" {
  description = "VPC IP range for firewall rules"
  type        = string
  default     = "10.10.0.0/16"
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = list(string)
}

variable "server_image" {
  description = "Ubuntu image for TURN server"
  type        = string
}

variable "server_size" {
  description = "TURN server droplet size"
  type        = string
}

variable "turn_secret" {
  description = "Shared secret for TURN server authentication"
  type        = string
  sensitive   = true
}

variable "turn_realm" {
  description = "Realm for TURN server"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key for server access (optional)"
  type        = string
  default     = ""
}

variable "use_reserved_ip" {
  description = "Use reserved IP for TURN server"
  type        = bool
  default     = false
}
