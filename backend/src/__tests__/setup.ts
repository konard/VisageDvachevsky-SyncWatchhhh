import { afterAll, beforeAll } from 'vitest';
import { config } from 'dotenv';
import { closeRedisConnections } from '../config/redis.js';
import { closePrisma } from '../config/prisma.js';

// Load test environment variables from .env.test if it exists
beforeAll(() => {
  config({ path: '.env.test' });
});

// Set up fallback test environment variables if not provided
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_testing_purposes_only_32chars';
process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
process.env.MINIO_PORT = process.env.MINIO_PORT || '9000';
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'test_access_key';
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'test_secret_key';
process.env.MINIO_USE_SSL = process.env.MINIO_USE_SSL || 'false';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Clean up connections after all tests
afterAll(async () => {
  await closeRedisConnections();
  await closePrisma();
});
