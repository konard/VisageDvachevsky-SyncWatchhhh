# TURN Server Module Outputs

output "server_id" {
  description = "TURN server droplet ID"
  value       = digitalocean_droplet.turn.id
}

output "server_urn" {
  description = "TURN server droplet URN"
  value       = digitalocean_droplet.turn.urn
}

output "server_ip" {
  description = "TURN server public IP address"
  value       = var.use_reserved_ip && length(digitalocean_reserved_ip.turn) > 0 ? digitalocean_reserved_ip.turn[0].ip_address : digitalocean_droplet.turn.ipv4_address
}

output "server_ipv6" {
  description = "TURN server IPv6 address"
  value       = digitalocean_droplet.turn.ipv6_address
}

output "server_private_ip" {
  description = "TURN server private IP address"
  value       = digitalocean_droplet.turn.ipv4_address_private
}

output "server_name" {
  description = "TURN server name"
  value       = digitalocean_droplet.turn.name
}

output "firewall_id" {
  description = "TURN server firewall ID"
  value       = digitalocean_firewall.turn.id
}

output "turn_config" {
  description = "TURN server configuration for clients"
  value = {
    urls = [
      "turn:${var.use_reserved_ip && length(digitalocean_reserved_ip.turn) > 0 ? digitalocean_reserved_ip.turn[0].ip_address : digitalocean_droplet.turn.ipv4_address}:3478?transport=udp",
      "turn:${var.use_reserved_ip && length(digitalocean_reserved_ip.turn) > 0 ? digitalocean_reserved_ip.turn[0].ip_address : digitalocean_droplet.turn.ipv4_address}:3478?transport=tcp",
      "turns:${var.use_reserved_ip && length(digitalocean_reserved_ip.turn) > 0 ? digitalocean_reserved_ip.turn[0].ip_address : digitalocean_droplet.turn.ipv4_address}:5349?transport=tcp"
    ]
    realm = var.turn_realm
  }
}
