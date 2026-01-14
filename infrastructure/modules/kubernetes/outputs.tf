# Kubernetes Module Outputs

output "cluster_id" {
  description = "Kubernetes cluster ID"
  value       = digitalocean_kubernetes_cluster.main.id
}

output "cluster_urn" {
  description = "Kubernetes cluster URN"
  value       = digitalocean_kubernetes_cluster.main.urn
}

output "cluster_name" {
  description = "Kubernetes cluster name"
  value       = digitalocean_kubernetes_cluster.main.name
}

output "cluster_endpoint" {
  description = "Kubernetes cluster endpoint"
  value       = digitalocean_kubernetes_cluster.main.endpoint
  sensitive   = true
}

output "cluster_ipv4_address" {
  description = "Kubernetes cluster IPv4 address"
  value       = digitalocean_kubernetes_cluster.main.ipv4_address
}

output "cluster_version" {
  description = "Kubernetes cluster version"
  value       = digitalocean_kubernetes_cluster.main.version
}

output "cluster_status" {
  description = "Kubernetes cluster status"
  value       = digitalocean_kubernetes_cluster.main.status
}

output "kubeconfig" {
  description = "Kubernetes cluster kubeconfig"
  value       = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  sensitive   = true
}

output "kubeconfig_file" {
  description = "Path to kubeconfig file"
  value       = local_file.kubeconfig.filename
}
