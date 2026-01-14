import { afterAll, beforeAll } from 'vitest';
import { config } from 'dotenv';
import { closeRedisConnections } from '../config/redis.js';
import { closePrisma } from '../config/prisma.js';

// Load test environment variables
beforeAll(() => {
  config({ path: '.env.test' });
});

// Clean up connections after all tests
afterAll(async () => {
  await closeRedisConnections();
  await closePrisma();
});
