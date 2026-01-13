/**
 * Test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../database/client.js';

beforeAll(async () => {
  // Ensure we're using a test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('Warning: Not using a test database!');
  }
});

afterAll(async () => {
  // Disconnect from database after all tests
  await prisma.$disconnect();
});
