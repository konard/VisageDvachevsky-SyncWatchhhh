import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { friendsRoutes } from '../routes.js';
import { authRoutes } from '../../auth/routes.js';
import { prisma } from '../../../common/utils/prisma.js';

describe('Friends Routes Integration', () => {
  let app: FastifyInstance;
  let user1AccessToken: string;
  let user2AccessToken: string;
  let user3AccessToken: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  const testEmail1 = `friend-test-1-${Date.now()}@example.com`;
  const testEmail2 = `friend-test-2-${Date.now()}@example.com`;
  const testEmail3 = `friend-test-3-${Date.now()}@example.com`;
  const testUsername1 = `friendtest1${Date.now()}`;
  const testUsername2 = `friendtest2${Date.now()}`;
  const testUsername3 = `friendtest3${Date.now()}`;
  const testPassword = 'testPassword123';

  beforeAll(async () => {
    app = Fastify();
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(friendsRoutes, { prefix: '/api' });
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
    user2AccessToken = body2.accessToken;
    user2Id = body2.user.id;

    const response3 = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail3,
        username: testUsername3,
        password: testPassword,
      },
    });
    const body3 = JSON.parse(response3.body);
    user3AccessToken = body3.accessToken;
    user3Id = body3.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: { in: [user1Id, user2Id, user3Id] } },
          { addresseeId: { in: [user1Id, user2Id, user3Id] } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: testEmail1 },
          { email: testEmail2 },
          { email: testEmail3 },
        ],
      },
    });

    await app.close();
  });

  describe('POST /api/friends/request', () => {
    it('should send a friend request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
        payload: {
          addresseeId: user2Id,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.friendship).toBeDefined();
      expect(body.friendship.requesterId).toBe(user1Id);
      expect(body.friendship.addresseeId).toBe(user2Id);
      expect(body.friendship.status).toBe('pending');
    });

    it('should reject sending request to self', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
        payload: {
          addresseeId: user1Id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Cannot send friend request to yourself');
    });

    it('should reject duplicate friend request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
        payload: {
          addresseeId: user2Id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Friend request already pending');
    });

    it('should reject request without authorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        payload: {
          addresseeId: user2Id,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/friends/requests', () => {
    it('should get pending friend requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/friends/requests',
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.requests).toBeDefined();
      expect(Array.isArray(body.requests)).toBe(true);
      expect(body.requests.length).toBeGreaterThan(0);
      expect(body.requests[0].requesterId).toBe(user1Id);
      expect(body.requests[0].addresseeId).toBe(user2Id);
    });

    it('should return empty array if no pending requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/friends/requests',
        headers: {
          authorization: `Bearer ${user3AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.requests).toBeDefined();
      expect(Array.isArray(body.requests)).toBe(true);
      expect(body.requests.length).toBe(0);
    });
  });

  describe('POST /api/friends/accept/:id', () => {
    it('should accept a friend request', async () => {
      // Get the friendship ID
      const requestsResponse = await app.inject({
        method: 'GET',
        url: '/api/friends/requests',
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });
      const requestsBody = JSON.parse(requestsResponse.body);
      const friendshipId = requestsBody.requests[0].id;

      const response = await app.inject({
        method: 'POST',
        url: `/api/friends/accept/${friendshipId}`,
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.friendship).toBeDefined();
      expect(body.friendship.status).toBe('accepted');
    });

    it('should reject accepting already accepted request', async () => {
      // Get the friendship ID
      const friendsResponse = await app.inject({
        method: 'GET',
        url: '/api/friends',
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });
      const friendsBody = JSON.parse(friendsResponse.body);
      const friendshipId = friendsBody.friends[0].friendshipId;

      const response = await app.inject({
        method: 'POST',
        url: `/api/friends/accept/${friendshipId}`,
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Friend request is not pending');
    });
  });

  describe('GET /api/friends', () => {
    it('should get all friends', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/friends',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.friends).toBeDefined();
      expect(Array.isArray(body.friends)).toBe(true);
      expect(body.friends.length).toBe(1);
      expect(body.friends[0].id).toBe(user2Id);
      expect(body.friends[0].username).toBe(testUsername2);
    });

    it('should return empty array if no friends', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/friends',
        headers: {
          authorization: `Bearer ${user3AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.friends).toBeDefined();
      expect(Array.isArray(body.friends)).toBe(true);
      expect(body.friends.length).toBe(0);
    });
  });

  describe('DELETE /api/friends/:id', () => {
    it('should remove a friend', async () => {
      // Get the friendship ID
      const friendsResponse = await app.inject({
        method: 'GET',
        url: '/api/friends',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });
      const friendsBody = JSON.parse(friendsResponse.body);
      const friendshipId = friendsBody.friends[0].friendshipId;

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/friends/${friendshipId}`,
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Friend removed');

      // Verify friend was removed
      const verifyResponse = await app.inject({
        method: 'GET',
        url: '/api/friends',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });
      const verifyBody = JSON.parse(verifyResponse.body);
      expect(verifyBody.friends.length).toBe(0);
    });
  });

  describe('POST /api/friends/block/:id', () => {
    it('should block a user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/friends/block/${user3Id}`,
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('User blocked');
    });

    it('should reject sending friend request to blocked user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: {
          authorization: `Bearer ${user1AccessToken}`,
        },
        payload: {
          addresseeId: user3Id,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Cannot send friend request to blocked user');
    });
  });

  describe('DELETE /api/friends/decline/:id', () => {
    it('should decline a friend request', async () => {
      // User 3 sends request to User 2
      await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: {
          authorization: `Bearer ${user3AccessToken}`,
        },
        payload: {
          addresseeId: user2Id,
        },
      });

      // Get the friendship ID
      const requestsResponse = await app.inject({
        method: 'GET',
        url: '/api/friends/requests',
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });
      const requestsBody = JSON.parse(requestsResponse.body);
      const friendshipId = requestsBody.requests[0].id;

      // Decline the request
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/friends/decline/${friendshipId}`,
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Friend request declined');

      // Verify request was removed
      const verifyResponse = await app.inject({
        method: 'GET',
        url: '/api/friends/requests',
        headers: {
          authorization: `Bearer ${user2AccessToken}`,
        },
      });
      const verifyBody = JSON.parse(verifyResponse.body);
      expect(verifyBody.requests.length).toBe(0);
    });
  });
});
