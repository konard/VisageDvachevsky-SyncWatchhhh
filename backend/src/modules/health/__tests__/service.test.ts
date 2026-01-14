import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPostgres, checkRedis, checkMinio, performReadinessChecks } from '../service.js';

// Mock dependencies
vi.mock('../../../config/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../../../config/redis.js', () => ({
  stateRedis: {
    ping: vi.fn(),
  },
}));

vi.mock('../../../config/minio.js', () => ({
  minioClient: {
    listBuckets: vi.fn(),
  },
}));

vi.mock('../../../config/logger.js', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('Health Check Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPostgres', () => {
    it('should return healthy when database is accessible', async () => {
      const { prisma } = await import('../../../config/prisma.js');
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ result: 1 }]);

      const result = await checkPostgres();

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when database is not accessible', async () => {
      const { prisma } = await import('../../../config/prisma.js');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));

      const result = await checkPostgres();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
      expect(result.latencyMs).toBeUndefined();
    });
  });

  describe('checkRedis', () => {
    it('should return healthy when Redis is accessible', async () => {
      const { stateRedis } = await import('../../../config/redis.js');
      vi.mocked(stateRedis.ping).mockResolvedValue('PONG');

      const result = await checkRedis();

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when Redis is not accessible', async () => {
      const { stateRedis } = await import('../../../config/redis.js');
      vi.mocked(stateRedis.ping).mockRejectedValue(new Error('Connection refused'));

      const result = await checkRedis();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
      expect(result.latencyMs).toBeUndefined();
    });
  });

  describe('checkMinio', () => {
    it('should return healthy when MinIO is accessible', async () => {
      const { minioClient } = await import('../../../config/minio.js');
      vi.mocked(minioClient.listBuckets).mockResolvedValue([]);

      const result = await checkMinio();

      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when MinIO is not accessible', async () => {
      const { minioClient } = await import('../../../config/minio.js');
      vi.mocked(minioClient.listBuckets).mockRejectedValue(new Error('Connection refused'));

      const result = await checkMinio();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection refused');
      expect(result.latencyMs).toBeUndefined();
    });
  });

  describe('performReadinessChecks', () => {
    it('should return ok status when all checks pass', async () => {
      const { prisma } = await import('../../../config/prisma.js');
      const { stateRedis } = await import('../../../config/redis.js');
      const { minioClient } = await import('../../../config/minio.js');

      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ result: 1 }]);
      vi.mocked(stateRedis.ping).mockResolvedValue('PONG');
      vi.mocked(minioClient.listBuckets).mockResolvedValue([]);

      const result = await performReadinessChecks();

      expect(result.status).toBe('ok');
      expect(result.checks.postgres.healthy).toBe(true);
      expect(result.checks.redis.healthy).toBe(true);
      expect(result.checks.minio.healthy).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when any check fails', async () => {
      const { prisma } = await import('../../../config/prisma.js');
      const { stateRedis } = await import('../../../config/redis.js');
      const { minioClient } = await import('../../../config/minio.js');

      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ result: 1 }]);
      vi.mocked(stateRedis.ping).mockRejectedValue(new Error('Connection refused'));
      vi.mocked(minioClient.listBuckets).mockResolvedValue([]);

      const result = await performReadinessChecks();

      expect(result.status).toBe('degraded');
      expect(result.checks.postgres.healthy).toBe(true);
      expect(result.checks.redis.healthy).toBe(false);
      expect(result.checks.minio.healthy).toBe(true);
    });

    it('should return degraded status when all checks fail', async () => {
      const { prisma } = await import('../../../config/prisma.js');
      const { stateRedis } = await import('../../../config/redis.js');
      const { minioClient } = await import('../../../config/minio.js');

      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB error'));
      vi.mocked(stateRedis.ping).mockRejectedValue(new Error('Redis error'));
      vi.mocked(minioClient.listBuckets).mockRejectedValue(new Error('MinIO error'));

      const result = await performReadinessChecks();

      expect(result.status).toBe('degraded');
      expect(result.checks.postgres.healthy).toBe(false);
      expect(result.checks.redis.healthy).toBe(false);
      expect(result.checks.minio.healthy).toBe(false);
    });
  });
});
