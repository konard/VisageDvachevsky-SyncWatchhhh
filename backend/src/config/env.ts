import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().default('postgresql://test:test@localhost:5432/test'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().default('test_jwt_secret_for_testing_purposes_only_minimum_32_characters_long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // MinIO / S3
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string().default('test_minio_access_key'),
  MINIO_SECRET_KEY: z.string().default('test_minio_secret_key'),
  MINIO_BUCKET: z.string().default('syncwatch-videos'),

  // WebSocket
  WS_PING_TIMEOUT: z.coerce.number().default(10000),
  WS_PING_INTERVAL: z.coerce.number().default(25000),

  // Limits
  MAX_UPLOAD_SIZE: z.coerce.number().default(8 * 1024 * 1024 * 1024), // 8GB
  MAX_VIDEO_DURATION: z.coerce.number().default(3 * 60 * 60), // 3 hours
  MAX_ROOM_PARTICIPANTS: z.coerce.number().default(5),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
