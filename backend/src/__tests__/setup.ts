import { afterAll } from 'vitest';
import { closeRedisConnections } from '../config/redis.js';
import { closePrisma } from '../config/prisma.js';

// Clean up connections after all tests
afterAll(async () => {
  await closeRedisConnections();
  await closePrisma();
});
