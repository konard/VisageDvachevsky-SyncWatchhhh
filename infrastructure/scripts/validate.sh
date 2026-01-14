#!/bin/bash
# Terraform Validation Script
# This script validates Terraform configuration files

set -euo pipefail

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    log_error "Terraform is not installed"
    log_info "Install from: https://www.terraform.io/downloads"
    exit 1
fi

# Change to infrastructure directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
cd "$INFRA_DIR"

log_info "Validating Terraform configuration in: $INFRA_DIR"

# Format check
log_info "Checking Terraform formatting..."
if terraform fmt -check -recursive; then
    log_info "✓ Formatting is correct"
else
    log_warn "Formatting issues found. Run 'terraform fmt -recursive' to fix"
fi

# Initialize Terraform (without backend)
log_info "Initializing Terraform..."
terraform init -backend=false

# Validate configuration
log_info "Validating Terraform configuration..."
if terraform validate; then
    log_info "✓ Configuration is valid"
else
    log_error "✗ Configuration validation failed"
    exit 1
fi

# Validate modules
log_info "Validating modules..."
for module_dir in modules/*/; do
    if [ -d "$module_dir" ]; then
        log_info "Validating module: $(basename "$module_dir")"
        cd "$module_dir"
        terraform init -backend=false
        terraform validate
        cd "$INFRA_DIR"
    fi
done

log_info "✓ All validations passed!"
