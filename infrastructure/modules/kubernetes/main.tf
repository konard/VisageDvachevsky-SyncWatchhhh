# Kubernetes Module - DigitalOcean Kubernetes cluster

resource "digitalocean_kubernetes_cluster" "main" {
  name    = "${var.name_prefix}-k8s"
  region  = var.region
  version = var.k8s_version
  vpc_uuid = var.vpc_id

  tags = concat(
    var.common_tags,
    ["kubernetes:cluster"]
  )

  # Default node pool
  node_pool {
    name       = "default-pool"
    size       = var.node_size
    auto_scale = true
    min_nodes  = var.min_nodes
    max_nodes  = var.max_nodes

    tags = concat(
      var.common_tags,
      ["kubernetes:node-pool:default"]
    )
  }

  # Auto-upgrade for patch versions
  auto_upgrade = true
  surge_upgrade = true

  # Maintenance window - Sunday 2-4 AM UTC
  maintenance_policy {
    start_time = "02:00"
    day        = "sunday"
  }
}

# Kubeconfig for cluster access
resource "local_file" "kubeconfig" {
  content  = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  filename = "${path.root}/kubeconfig-${var.environment}.yaml"
  file_permission = "0600"

  lifecycle {
    ignore_changes = [content]
  }
}
