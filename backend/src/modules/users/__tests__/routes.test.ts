import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { usersRoutes } from '../routes.js';
import { authRoutes } from '../../auth/routes.js';
import { prisma } from '../../../common/utils/prisma.js';

describe('Users Routes Integration', () => {
  let app: FastifyInstance;
  let user1AccessToken: string;
  let user1Id: string;
  let user2Id: string;

  const testEmail1 = `user-search-1-${Date.now()}@example.com`;
  const testEmail2 = `user-search-2-${Date.now()}@example.com`;
  const testUsername1 = `searchtest1${Date.now()}`;
  const testUsername2 = `searchtest2${Date.now()}`;
  const testPassword = 'testPassword123';

  beforeAll(async () => {
    app = Fastify();
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(usersRoutes, { prefix: '/api' });
    await app.ready();

    // Create test users
    const response1 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail1,
        username: testUsername1,
        password: testPassword,
      },
    });
    const body1 = JSON.parse(response1.body);
    user1AccessToken = body1.accessToken;
    user1Id = body1.user.id;

    const response2 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail2,
        username: testUsername2,
        password: testPassword,
      },
    });
    const body2 = JSON.parse(response2.body);
    user2Id = body2.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: testEmail1 }, { email: testEmail2 }],
      },
    });

    await app.close();
  });

  describe('GET /api/users/search', () => {
    it('should search users by username', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/search?query=${testUsername2}`,
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBeGreaterThan(0);
      expect(body.users[0].username).toContain(testUsername2);
    });

    it('should search users by email', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/search?query=${testEmail2}`,
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBeGreaterThan(0);
      expect(body.users[0].email).toContain(testEmail2);
    });

    it('should not include current user in search results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/search?query=searchtest`,
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);

      // Should not include user1 (current user)
      const hasCurrentUser = body.users.some((u: any) => u.id === user1Id);
      expect(hasCurrentUser).toBe(false);
    });

    it('should return empty array for no matches', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search?query=nonexistentuser12345',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search?query=searchtest&limit=1',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.users).toBeDefined();
      expect(body.users.length).toBeLessThanOrEqual(1);
    });

    it('should reject search without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search?query=test',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject search without query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/search',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${user2Id}`,
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(user2Id);
      expect(body.user.username).toBe(testUsername2);
      expect(body.user.email).toBe(testEmail2);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users/nonexistent-id-12345',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('User not found');
    });

    it('should reject request without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/users/${user2Id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
