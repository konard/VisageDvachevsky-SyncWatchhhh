#!/bin/bash
# TURN Server Setup Script for Coturn
# This script is executed via cloud-init on DigitalOcean droplet creation

set -euo pipefail

# Variables from Terraform
TURN_SECRET="${turn_secret}"
REALM="${realm}"
ENVIRONMENT="${environment}"

# Logging
exec 1> >(logger -s -t turn-setup) 2>&1

echo "Starting TURN server setup for environment: $ENVIRONMENT"

# Update system
apt-get update
apt-get upgrade -y

# Install coturn
apt-get install -y coturn

# Enable coturn service
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Configure coturn
cat > /etc/turnserver.conf << EOF
# Basic configuration
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=$TURN_SECRET
realm=$REALM

# Total quota
total-quota=100
# Max bps (bytes per second)
bps-capacity=0
# Stale nonce
stale-nonce=600

# Server name
server-name=turn.$REALM

# Logging
log-file=/var/log/turnserver.log
simple-log

# Performance tuning
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1

# Security
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
no-loopback-peers
no-multicast-peers

# Relay configuration
min-port=49152
max-port=65535

# Enable Prometheus metrics (optional)
prometheus

# User quotas
user-quota=0
total-quota=0

# Verbose logging for debugging (disable in production)
$([ "$ENVIRONMENT" = "staging" ] && echo "verbose" || echo "# verbose disabled")
EOF

# Create log file
touch /var/log/turnserver.log
chown turnserver:turnserver /var/log/turnserver.log

# Optional: Generate self-signed certificate for TURNS
# In production, replace with proper SSL certificate
if [ ! -f /etc/coturn/cert.pem ]; then
    echo "Generating self-signed certificate..."
    openssl req -x509 -newkey rsa:4096 -keyout /etc/coturn/privkey.pem \
        -out /etc/coturn/cert.pem -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=SyncWatch/CN=turn.$REALM"

    # Add certificate configuration
    cat >> /etc/turnserver.conf << EOF

# TLS configuration
cert=/etc/coturn/cert.pem
pkey=/etc/coturn/privkey.pem
EOF

    chown turnserver:turnserver /etc/coturn/*.pem
    chmod 600 /etc/coturn/privkey.pem
fi

# Restart coturn service
systemctl restart coturn
systemctl enable coturn

# Setup monitoring
cat > /usr/local/bin/turn-health-check.sh << 'HEALTHCHECK'
#!/bin/bash
# Simple health check for TURN server

# Check if coturn is running
if ! systemctl is-active --quiet coturn; then
    echo "ERROR: coturn service is not running"
    exit 1
fi

# Check if ports are listening
if ! netstat -ln | grep -q ':3478'; then
    echo "ERROR: TURN port 3478 is not listening"
    exit 1
fi

echo "OK: TURN server is healthy"
exit 0
HEALTHCHECK

chmod +x /usr/local/bin/turn-health-check.sh

# Setup log rotation
cat > /etc/logrotate.d/turnserver << 'LOGROTATE'
/var/log/turnserver.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 turnserver turnserver
    postrotate
        systemctl reload coturn > /dev/null 2>&1 || true
    endscript
}
LOGROTATE

# Setup cron for health checks
cat > /etc/cron.d/turn-health-check << 'CRONFILE'
*/5 * * * * root /usr/local/bin/turn-health-check.sh >> /var/log/turn-health.log 2>&1
CRONFILE

# Enable UFW firewall
ufw --force enable
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 49152:65535/udp
ufw allow from 10.10.0.0/16 to any port 22  # SSH from VPC only

echo "TURN server setup completed successfully"
echo "Server is ready to accept WebRTC connections"
