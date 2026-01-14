import { z } from 'zod';
import { getSecret } from './secrets';
import { getCurrentEnvironment, getEnvironmentConfig } from './environments';

/**
 * Load environment variables with support for Docker Secrets
 * Priority: Docker Secrets (_FILE suffix) > Environment Variables > Defaults
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  // Database - supports _FILE suffix for Docker Secrets
  DATABASE_URL: z.string().default('postgresql://test:test@localhost:5432/test'),

  // Redis - supports _FILE suffix for Docker Secrets
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // JWT - supports _FILE suffix for Docker Secrets
  JWT_SECRET: z.string().default('test_jwt_secret_for_testing_purposes_only_minimum_32_characters_long'),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),

  // MinIO / S3 - supports _FILE suffix for Docker Secrets
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string().default('test_minio_access_key'),
  MINIO_SECRET_KEY: z.string().default('test_minio_secret_key'),
  MINIO_BUCKET: z.string().default('syncwatch-videos'),
  MINIO_REGION: z.string().default('us-east-1'),

  // TURN/STUN - supports _FILE suffix for Docker Secrets
  TURN_SERVER_URL: z.string().optional(),
  TURN_SERVER_URL_BACKUP: z.string().optional(),
  TURN_SECRET: z.string().optional(),
  TURN_CREDENTIAL_TTL: z.coerce.number().default(86400),

  // WebSocket
  WS_PING_TIMEOUT: z.coerce.number().default(10000),
  WS_PING_INTERVAL: z.coerce.number().default(25000),

  // Limits
  MAX_UPLOAD_SIZE: z.coerce.number().default(8 * 1024 * 1024 * 1024), // 8GB
  MAX_VIDEO_DURATION: z.coerce.number().default(3 * 60 * 60), // 3 hours
  MAX_ROOM_PARTICIPANTS: z.coerce.number().default(5),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_METRICS: z.coerce.boolean().default(false),
  ENABLE_TRACING: z.coerce.boolean().default(false),
  // TURN Server (for WebRTC NAT traversal)
  TURN_SERVER_URL: z.string().default('turn:localhost:3478'),
  TURN_SERVER_SECRET: z.string().default('syncwatch_turn_secret_change_in_production'),
  TURN_CREDENTIAL_TTL: z.coerce.number().default(86400), // 24 hours
});

export type Env = z.infer<typeof envSchema>;

/**
 * Load secrets from Docker Secrets or environment variables
 */
function loadSecretsIntoEnv(): void {
  // Skip secret loading in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const currentEnv = getCurrentEnvironment();

  // Load critical secrets with _FILE support
  const secretMappings = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'TURN_SECRET',
  ];

  for (const secretName of secretMappings) {
    // Only load if not already set and _FILE variant exists
    if (!process.env[secretName] && process.env[`${secretName}_FILE`]) {
      try {
        const secretValue = getSecret(secretName);
        process.env[secretName] = secretValue;
      } catch (error) {
        // Only fail for critical secrets in staging/production
        if (currentEnv !== 'development') {
          console.warn(`Failed to load secret ${secretName}:`, error);
        }
      }
    }
  }
}

// Load secrets before parsing environment
loadSecretsIntoEnv();

export const env = envSchema.parse(process.env);

// Validate environment configuration
if (process.env.NODE_ENV !== 'test') {
  const envConfig = getEnvironmentConfig();
  console.info(`Environment: ${envConfig.name}`);
  console.info(`API URL: ${envConfig.apiUrl}`);
  console.info(`Metrics enabled: ${envConfig.enableMetrics}`);
  console.info(`Tracing enabled: ${envConfig.enableTracing}`);
}
