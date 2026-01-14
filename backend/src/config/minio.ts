/**
 * MinIO Client Configuration
 * S3-compatible object storage for video files
 */

import { Client as MinioClient } from 'minio';
import { env } from './env.js';
import { logger } from './logger.js';

export const minioClient = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const BUCKETS = {
  VIDEOS: 'videos',
  HLS: 'hls',
} as const;

/**
 * Ensure required buckets exist
 */
export async function ensureBuckets(): Promise<void> {
  try {
    for (const bucket of Object.values(BUCKETS)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        logger.info({ bucket }, 'Created MinIO bucket');
      }
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to ensure MinIO buckets');
    throw error;
  }
}
