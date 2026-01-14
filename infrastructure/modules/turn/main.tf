# TURN Server Module - WebRTC relay server

# SSH Key for TURN server (optional, for debugging)
resource "digitalocean_ssh_key" "turn" {
  count = var.ssh_public_key != "" ? 1 : 0

  name       = "${var.name_prefix}-turn-key"
  public_key = var.ssh_public_key
}

# TURN Server Droplet
resource "digitalocean_droplet" "turn" {
  name   = "${var.name_prefix}-turn"
  image  = var.server_image
  size   = var.server_size
  region = var.region
  vpc_uuid = var.vpc_id

  ssh_keys = var.ssh_public_key != "" ? [digitalocean_ssh_key.turn[0].id] : []

  tags = concat(
    var.common_tags,
    ["turn-server", "webrtc"]
  )

  user_data = templatefile("${path.module}/scripts/turn-setup.sh", {
    turn_secret = var.turn_secret
    realm       = var.turn_realm
    environment = var.environment
  })

  # Ensure proper startup
  monitoring = true
  ipv6       = true
}

# Firewall for TURN server
resource "digitalocean_firewall" "turn" {
  name = "${var.name_prefix}-turn-firewall"

  droplet_ids = [digitalocean_droplet.turn.id]

  # STUN/TURN UDP
  inbound_rule {
    protocol         = "udp"
    port_range       = "3478"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # STUN/TURN TCP
  inbound_rule {
    protocol         = "tcp"
    port_range       = "3478"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # TURN TLS
  inbound_rule {
    protocol         = "tcp"
    port_range       = "5349"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # UDP relay ports
  inbound_rule {
    protocol         = "udp"
    port_range       = "49152-65535"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # SSH (only from VPC)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = [var.vpc_ip_range]
  }

  # Allow all outbound
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Reserved IP for TURN server (optional, for production stability)
resource "digitalocean_reserved_ip" "turn" {
  count = var.use_reserved_ip ? 1 : 0

  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "turn" {
  count = var.use_reserved_ip ? 1 : 0

  ip_address = digitalocean_reserved_ip.turn[0].ip_address
  droplet_id = digitalocean_droplet.turn.id
}
