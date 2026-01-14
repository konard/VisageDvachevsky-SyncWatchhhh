# Kubernetes Module Variables

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

variable "k8s_version" {
  description = "Kubernetes version"
  type        = string
}

variable "node_size" {
  description = "Node droplet size"
  type        = string
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
}
