/**
 * Environment-specific configuration for SyncWatch
 *
 * This module provides isolated configurations for different deployment environments:
 * - development: Local development with relaxed security
 * - staging: Pre-production testing with production-like settings
 * - production: Live deployment with strict security
 */

export type EnvironmentName = 'development' | 'staging' | 'production';

export interface TurnServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface EnvironmentConfig {
  name: EnvironmentName;

  // API Configuration
  apiUrl: string;
  wsUrl: string;
  frontendUrl: string;

  // Database Configuration
  databaseUrl: string;
  databasePoolMin: number;
  databasePoolMax: number;
  databaseStatementTimeout: number; // milliseconds

  // Redis Configuration
  redisUrl: string;
  redisDatabase: number;
  redisMaxRetries: number;

  // Storage Configuration (MinIO/S3)
  minioEndpoint: string;
  minioPort: number;
  minioUseSSL: boolean;
  minioBucket: string;
  minioRegion: string;

  // TURN/STUN Configuration
  turnServers: TurnServer[];
  turnCredentialTTL: number; // seconds

  // Security
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  corsOrigins: string[];
  rateLimitEnabled: boolean;
  rateLimitMax: number;
  rateLimitWindowMs: number;

  // Features & Observability
  enableDebugLogs: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Resource Limits
  maxUploadSize: number; // bytes
  maxVideoDuration: number; // seconds
  maxRoomParticipants: number;
  videoExpiryHours: number;

  // Worker Configuration
  workerConcurrency: number;
  transcoderMemoryLimit: string;
}

/**
 * Get the current environment name from NODE_ENV
 */
export function getCurrentEnvironment(): EnvironmentName {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production' || env === 'staging') {
    return env as EnvironmentName;
  }

  return 'development';
}

/**
 * Environment-specific configurations
 *
 * Note: Sensitive values (secrets, passwords, keys) should NEVER be hardcoded here.
 * They must be loaded from environment variables or external secret management systems.
 */
const environments: Record<EnvironmentName, EnvironmentConfig> = {
  development: {
    name: 'development',

    // API
    apiUrl: process.env.API_URL || 'http://localhost:4000',
    wsUrl: process.env.WS_URL || 'ws://localhost:4000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://syncwatch:syncwatch_dev@localhost:5432/syncwatch_dev',
    databasePoolMin: 1,
    databasePoolMax: 5,
    databaseStatementTimeout: 30000,

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisDatabase: 0,
    redisMaxRetries: 3,

    // Storage
    minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
    minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
    minioUseSSL: process.env.MINIO_USE_SSL === 'true',
    minioBucket: process.env.MINIO_BUCKET || 'syncwatch-dev',
    minioRegion: process.env.MINIO_REGION || 'us-east-1',

    // TURN/STUN
    turnServers: [
      {
        urls: [process.env.TURN_SERVER_URL || 'turn:localhost:3478'],
      },
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
    turnCredentialTTL: 86400, // 24 hours

    // Security
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    corsOrigins: [process.env.CORS_ORIGIN || 'http://localhost:3000'],
    rateLimitEnabled: false,
    rateLimitMax: 1000,
    rateLimitWindowMs: 60000,

    // Features
    enableDebugLogs: true,
    enableMetrics: false,
    enableTracing: false,
    logLevel: 'debug',

    // Limits
    maxUploadSize: 8 * 1024 * 1024 * 1024, // 8GB
    maxVideoDuration: 3 * 60 * 60, // 3 hours
    maxRoomParticipants: 5,
    videoExpiryHours: 72,

    // Worker
    workerConcurrency: 1,
    transcoderMemoryLimit: '2g',
  },

  staging: {
    name: 'staging',

    // API
    apiUrl: process.env.API_URL || 'https://staging-api.syncwatch.example',
    wsUrl: process.env.WS_URL || 'wss://staging-api.syncwatch.example',
    frontendUrl: process.env.FRONTEND_URL || 'https://staging.syncwatch.example',

    // Database
    databaseUrl: process.env.DATABASE_URL || '',
    databasePoolMin: 2,
    databasePoolMax: 10,
    databaseStatementTimeout: 15000,

    // Redis
    redisUrl: process.env.REDIS_URL || '',
    redisDatabase: 0,
    redisMaxRetries: 5,

    // Storage
    minioEndpoint: process.env.MINIO_ENDPOINT || 's3.amazonaws.com',
    minioPort: parseInt(process.env.MINIO_PORT || '443', 10),
    minioUseSSL: process.env.MINIO_USE_SSL !== 'false',
    minioBucket: process.env.MINIO_BUCKET || 'syncwatch-staging',
    minioRegion: process.env.MINIO_REGION || 'us-east-1',

    // TURN/STUN
    turnServers: [
      {
        urls: [process.env.TURN_SERVER_URL || 'turn:staging-turn.syncwatch.example:3478'],
      },
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
    turnCredentialTTL: 86400, // 24 hours

    // Security
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    corsOrigins: (process.env.CORS_ORIGINS || 'https://staging.syncwatch.example').split(','),
    rateLimitEnabled: true,
    rateLimitMax: 100,
    rateLimitWindowMs: 60000,

    // Features
    enableDebugLogs: true,
    enableMetrics: true,
    enableTracing: true,
    logLevel: 'info',

    // Limits
    maxUploadSize: 8 * 1024 * 1024 * 1024, // 8GB
    maxVideoDuration: 3 * 60 * 60, // 3 hours
    maxRoomParticipants: 5,
    videoExpiryHours: 72,

    // Worker
    workerConcurrency: 2,
    transcoderMemoryLimit: '4g',
  },

  production: {
    name: 'production',

    // API
    apiUrl: process.env.API_URL || 'https://api.syncwatch.example',
    wsUrl: process.env.WS_URL || 'wss://api.syncwatch.example',
    frontendUrl: process.env.FRONTEND_URL || 'https://syncwatch.example',

    // Database
    databaseUrl: process.env.DATABASE_URL || '',
    databasePoolMin: 5,
    databasePoolMax: 50,
    databaseStatementTimeout: 10000,

    // Redis
    redisUrl: process.env.REDIS_URL || '',
    redisDatabase: 0,
    redisMaxRetries: 10,

    // Storage
    minioEndpoint: process.env.MINIO_ENDPOINT || 's3.amazonaws.com',
    minioPort: parseInt(process.env.MINIO_PORT || '443', 10),
    minioUseSSL: process.env.MINIO_USE_SSL !== 'false',
    minioBucket: process.env.MINIO_BUCKET || 'syncwatch-prod',
    minioRegion: process.env.MINIO_REGION || 'us-east-1',

    // TURN/STUN
    turnServers: [
      {
        urls: [process.env.TURN_SERVER_URL || 'turn:turn.syncwatch.example:3478'],
      },
      {
        urls: [process.env.TURN_SERVER_URL_BACKUP || 'turn:turn-backup.syncwatch.example:3478'],
      },
      {
        urls: ['stun:stun.l.google.com:19302'],
      },
    ],
    turnCredentialTTL: 86400, // 24 hours

    // Security
    jwtAccessExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    corsOrigins: (process.env.CORS_ORIGINS || 'https://syncwatch.example').split(','),
    rateLimitEnabled: true,
    rateLimitMax: 100,
    rateLimitWindowMs: 60000,

    // Features
    enableDebugLogs: false,
    enableMetrics: true,
    enableTracing: true,
    logLevel: 'warn',

    // Limits
    maxUploadSize: 8 * 1024 * 1024 * 1024, // 8GB
    maxVideoDuration: 3 * 60 * 60, // 3 hours
    maxRoomParticipants: 5,
    videoExpiryHours: 72,

    // Worker
    workerConcurrency: 4,
    transcoderMemoryLimit: '8g',
  },
};

/**
 * Get configuration for the current environment
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const envName = getCurrentEnvironment();
  return environments[envName];
}

/**
 * Validate that required secrets are present for the current environment
 * Throws an error if critical secrets are missing
 */
export function validateSecrets(): void {
  const env = getCurrentEnvironment();
  const missingSecrets: string[] = [];

  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Critical secrets required in all environments
  const criticalSecrets = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  // Additional secrets required in staging and production
  if (env === 'staging' || env === 'production') {
    criticalSecrets.push(
      'REDIS_URL',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'TURN_SECRET',
    );
  }

  for (const secret of criticalSecrets) {
    if (!process.env[secret]) {
      missingSecrets.push(secret);
    }
  }

  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required secrets for ${env} environment: ${missingSecrets.join(', ')}\n` +
      'Please ensure all required secrets are set in environment variables or secret management system.'
    );
  }
}
