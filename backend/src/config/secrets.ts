/**
 * Secrets Management Module
 *
 * Provides utilities for loading secrets from various sources:
 * 1. Docker Secrets (files in /run/secrets/)
 * 2. Environment variables
 * 3. Kubernetes ConfigMaps/Secrets
 *
 * Priority order:
 * 1. Docker Secret files (_FILE suffix)
 * 2. Direct environment variables
 * 3. Default values (only in development)
 */

import { readFileSync, existsSync } from 'fs';

/**
 * Read a secret from Docker Secrets or environment variable
 *
 * Supports Docker Swarm secrets by checking for {NAME}_FILE environment variable
 * that points to the secret file location (typically /run/secrets/{secret_name})
 *
 * @param name - Secret name (e.g., 'DATABASE_URL')
 * @param defaultValue - Default value (only used in development)
 * @returns Secret value
 */
export function getSecret(name: string, defaultValue?: string): string {
  // 1. Check for Docker Secret file reference
  const fileEnvVar = `${name}_FILE`;
  const secretFilePath = process.env[fileEnvVar];

  if (secretFilePath && existsSync(secretFilePath)) {
    try {
      const secretValue = readFileSync(secretFilePath, 'utf-8').trim();
      if (secretValue) {
        return secretValue;
      }
    } catch (error) {
      console.error(`Failed to read secret from file ${secretFilePath}:`, error);
      // Fall through to next method
    }
  }

  // 2. Check for direct environment variable
  const envValue = process.env[name];
  if (envValue) {
    return envValue;
  }

  // 3. Use default value (only in development)
  if (defaultValue !== undefined && process.env.NODE_ENV !== 'production') {
    return defaultValue;
  }

  throw new Error(
    `Secret "${name}" not found. ` +
    `Set environment variable ${name} or ${fileEnvVar} pointing to secret file.`
  );
}

/**
 * Get an optional secret that may not be present
 *
 * @param name - Secret name
 * @param defaultValue - Default value if not found
 * @returns Secret value or default
 */
export function getOptionalSecret(name: string, defaultValue: string = ''): string {
  try {
    return getSecret(name, defaultValue);
  } catch {
    return defaultValue;
  }
}

/**
 * Secret rotation metadata
 */
export interface SecretRotationInfo {
  category: 'database' | 'auth' | 'storage' | 'turn' | 'external';
  rotationDays: number;
  description: string;
}

/**
 * Secret rotation schedule
 */
export const SECRET_ROTATION_SCHEDULE: Record<string, SecretRotationInfo> = {
  // Database secrets - 90 days
  DATABASE_URL: {
    category: 'database',
    rotationDays: 90,
    description: 'PostgreSQL connection string with password',
  },
  POSTGRES_PASSWORD: {
    category: 'database',
    rotationDays: 90,
    description: 'PostgreSQL database password',
  },

  // Auth secrets - 30 days
  JWT_SECRET: {
    category: 'auth',
    rotationDays: 30,
    description: 'JWT signing secret for access tokens',
  },
  JWT_REFRESH_SECRET: {
    category: 'auth',
    rotationDays: 30,
    description: 'JWT signing secret for refresh tokens',
  },
  SESSION_SECRET: {
    category: 'auth',
    rotationDays: 30,
    description: 'Session cookie signing secret',
  },

  // Storage secrets - 90 days
  MINIO_ACCESS_KEY: {
    category: 'storage',
    rotationDays: 90,
    description: 'MinIO/S3 access key ID',
  },
  MINIO_SECRET_KEY: {
    category: 'storage',
    rotationDays: 90,
    description: 'MinIO/S3 secret access key',
  },

  // TURN secrets - 7 days
  TURN_SECRET: {
    category: 'turn',
    rotationDays: 7,
    description: 'TURN server shared secret for credential generation',
  },

  // External service secrets - as needed
  GITHUB_TOKEN: {
    category: 'external',
    rotationDays: 365,
    description: 'GitHub API token (if used)',
  },
  SENTRY_DSN: {
    category: 'external',
    rotationDays: 0, // No rotation needed
    description: 'Sentry error tracking DSN',
  },
};

/**
 * Audit log entry for secret access
 */
export interface SecretAuditEntry {
  timestamp: Date;
  secretName: string;
  source: 'file' | 'env' | 'default';
  success: boolean;
  environment: string;
}

const auditLog: SecretAuditEntry[] = [];

/**
 * Log secret access for audit trail
 */
export function logSecretAccess(
  secretName: string,
  source: 'file' | 'env' | 'default',
  success: boolean
): void {
  const entry: SecretAuditEntry = {
    timestamp: new Date(),
    secretName,
    source,
    success,
    environment: process.env.NODE_ENV || 'unknown',
  };

  auditLog.push(entry);

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to centralized logging (e.g., CloudWatch, Stackdriver)
    console.info('[SECRET_AUDIT]', JSON.stringify(entry));
  }
}

/**
 * Get audit log (for debugging/testing)
 */
export function getSecretAuditLog(): SecretAuditEntry[] {
  return [...auditLog];
}

/**
 * Check if a secret file exists (for health checks)
 */
export function checkSecretFile(secretName: string): boolean {
  const fileEnvVar = `${secretName}_FILE`;
  const secretFilePath = process.env[fileEnvVar];

  if (!secretFilePath) {
    return false;
  }

  return existsSync(secretFilePath);
}

/**
 * Load all critical secrets and validate their presence
 */
export function loadAndValidateSecrets(): Map<string, string> {
  const secrets = new Map<string, string>();
  const env = process.env.NODE_ENV || 'development';

  // Define critical secrets per environment
  const criticalSecrets: Record<string, string[]> = {
    development: ['DATABASE_URL', 'JWT_SECRET'],
    staging: ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'TURN_SECRET'],
    production: ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'TURN_SECRET'],
  };

  const requiredSecrets = criticalSecrets[env] || criticalSecrets.development;

  for (const secretName of requiredSecrets) {
    try {
      const value = getSecret(secretName);
      secrets.set(secretName, value);
      logSecretAccess(secretName, existsSync(`/run/secrets/${secretName}`) ? 'file' : 'env', true);
    } catch (error) {
      logSecretAccess(secretName, 'env', false);
      throw error;
    }
  }

  return secrets;
}

/**
 * Generate a secure random secret (for initialization scripts)
 *
 * @param length - Length of the secret (default: 32)
 * @returns Base64-encoded random secret
 */
export function generateSecret(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('base64');
}
