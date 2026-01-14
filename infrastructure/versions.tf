terraform {
  required_version = ">= 1.6"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
  }

  backend "s3" {
    # Backend configuration should be provided via backend config file or CLI
    # Example: terraform init -backend-config="bucket=syncwatch-terraform-state" \
    #                         -backend-config="key=<environment>/terraform.tfstate" \
    #                         -backend-config="region=us-east-1"
    #
    # Alternatively, use a backend configuration file:
    # terraform init -backend-config=backend.hcl
  }
}
