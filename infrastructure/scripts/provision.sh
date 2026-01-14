#!/bin/bash
# Infrastructure Provisioning Script for SyncWatch
# This script provisions infrastructure using Terraform

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
Usage: $0 [ENVIRONMENT] [ACTION]

Provisions SyncWatch infrastructure using Terraform.

Arguments:
    ENVIRONMENT     Deployment environment (staging or production)
    ACTION          Terraform action (plan, apply, destroy, output)

Examples:
    $0 staging plan         # Plan staging infrastructure
    $0 staging apply        # Apply staging infrastructure
    $0 production plan      # Plan production infrastructure
    $0 production apply     # Apply production infrastructure
    $0 staging destroy      # Destroy staging infrastructure
    $0 staging output       # Show staging outputs

Environment Variables:
    DIGITALOCEAN_TOKEN      DigitalOcean API token (required)
    TF_VAR_turn_secret      TURN server shared secret (required)
    AWS_ACCESS_KEY_ID       AWS access key for S3 backend (optional)
    AWS_SECRET_ACCESS_KEY   AWS secret key for S3 backend (optional)

EOF
}

# Parse arguments
ENVIRONMENT=${1:-}
ACTION=${2:-plan}

if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment not specified"
    show_usage
    exit 1
fi

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    log_error "Invalid environment: $ENVIRONMENT (must be 'staging' or 'production')"
    exit 1
fi

# Validate required environment variables
if [ -z "${DIGITALOCEAN_TOKEN:-}" ]; then
    log_error "DIGITALOCEAN_TOKEN environment variable is required"
    exit 1
fi

if [ -z "${TF_VAR_turn_secret:-}" ] && [ "$ACTION" != "destroy" ]; then
    log_error "TF_VAR_turn_secret environment variable is required"
    exit 1
fi

# Change to infrastructure directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
cd "$INFRA_DIR"

log_info "Working directory: $INFRA_DIR"
log_info "Environment: $ENVIRONMENT"
log_info "Action: $ACTION"

# Initialize Terraform
log_info "Initializing Terraform..."
if [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
    # Use S3 backend
    terraform init \
        -backend-config="bucket=syncwatch-terraform-state" \
        -backend-config="key=$ENVIRONMENT/terraform.tfstate" \
        -backend-config="region=us-east-1"
else
    # Use local backend
    log_warn "AWS credentials not found, using local backend"
    terraform init
fi

# Perform action
case "$ACTION" in
    plan)
        log_info "Planning infrastructure changes..."
        terraform plan \
            -var-file="environments/$ENVIRONMENT.tfvars" \
            -out="tfplan-$ENVIRONMENT"

        log_info "Plan saved to: tfplan-$ENVIRONMENT"
        log_warn "Review the plan above before applying"
        ;;

    apply)
        # Check if plan exists
        if [ ! -f "tfplan-$ENVIRONMENT" ]; then
            log_warn "No plan file found, generating plan first..."
            terraform plan \
                -var-file="environments/$ENVIRONMENT.tfvars" \
                -out="tfplan-$ENVIRONMENT"
        fi

        # Require manual approval for production
        if [ "$ENVIRONMENT" == "production" ]; then
            log_warn "You are about to apply changes to PRODUCTION environment"
            read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
            if [ "$confirm" != "yes" ]; then
                log_error "Deployment cancelled"
                exit 1
            fi
        fi

        log_info "Applying infrastructure changes..."
        terraform apply "tfplan-$ENVIRONMENT"

        # Remove plan file after successful apply
        rm -f "tfplan-$ENVIRONMENT"

        log_info "Infrastructure provisioned successfully!"
        log_info "Run '$0 $ENVIRONMENT output' to see connection details"
        ;;

    destroy)
        log_warn "You are about to DESTROY $ENVIRONMENT infrastructure"
        log_error "This action is IRREVERSIBLE and will delete all resources!"

        read -p "Are you ABSOLUTELY sure? (type 'yes-destroy-$ENVIRONMENT' to confirm): " confirm
        if [ "$confirm" != "yes-destroy-$ENVIRONMENT" ]; then
            log_error "Destruction cancelled"
            exit 1
        fi

        log_info "Destroying infrastructure..."
        terraform destroy \
            -var-file="environments/$ENVIRONMENT.tfvars"

        log_info "Infrastructure destroyed"
        ;;

    output)
        log_info "Fetching infrastructure outputs..."
        terraform output -json > "outputs-$ENVIRONMENT.json"

        log_info "Outputs saved to: outputs-$ENVIRONMENT.json"

        # Display non-sensitive outputs
        log_info "Infrastructure Details:"
        echo "----------------------------------------"
        terraform output -json | jq -r '
            to_entries[]
            | select(.value.sensitive == false)
            | "\(.key): \(.value.value)"
        '
        echo "----------------------------------------"
        log_warn "Sensitive values saved to outputs-$ENVIRONMENT.json"
        ;;

    *)
        log_error "Invalid action: $ACTION"
        log_info "Valid actions: plan, apply, destroy, output"
        exit 1
        ;;
esac

log_info "Done!"
