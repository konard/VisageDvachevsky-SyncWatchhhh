import { prisma } from '../../config/prisma.js';
import { stateRedis } from '../../config/redis.js';
import { minioClient } from '../../config/minio.js';
import { logger } from '../../config/logger.js';

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

export interface ReadinessCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    postgres: HealthCheckResult;
    redis: HealthCheckResult;
    minio: HealthCheckResult;
  };
}

/**
 * Check PostgreSQL database connectivity
 */
export async function checkPostgres(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;
    return { healthy: true, latencyMs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'PostgreSQL health check failed');
    return { healthy: false, error: errorMessage };
  }
}

/**
 * Check Redis connectivity
 */
export async function checkRedis(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    await stateRedis.ping();
    const latencyMs = Date.now() - startTime;
    return { healthy: true, latencyMs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Redis health check failed');
    return { healthy: false, error: errorMessage };
  }
}

/**
 * Check MinIO connectivity
 */
export async function checkMinio(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    // List buckets as a simple connectivity check
    await minioClient.listBuckets();
    const latencyMs = Date.now() - startTime;
    return { healthy: true, latencyMs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'MinIO health check failed');
    return { healthy: false, error: errorMessage };
  }
}

/**
 * Perform all readiness checks
 */
export async function performReadinessChecks(): Promise<ReadinessCheckResponse> {
  const [postgres, redis, minio] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMinio(),
  ]);

  const allHealthy = postgres.healthy && redis.healthy && minio.healthy;
  const status = allHealthy ? 'ok' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      postgres,
      redis,
      minio,
    },
  };
}
