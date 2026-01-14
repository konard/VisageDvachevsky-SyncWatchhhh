import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { usersRoutes } from '../routes.js';
import { authRoutes } from '../../auth/routes.js';
import { prisma } from '../../../common/utils/prisma.js';
import { hashPassword } from '../../../common/utils/password.js';
import { env } from '../../../config/env.js';

describe('Users Routes Integration', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let testAccessToken: string;
  let user2Id: string;
  let user2AccessToken: string;

  const testEmail = `usertest-${Date.now()}@example.com`;
  const testUsername = `usertest${Date.now()}`;
  const testEmail2 = `user-search-2-${Date.now()}@example.com`;
  const testUsername2 = `searchtest2${Date.now()}`;
  const testPassword = 'testPassword123';

  beforeAll(async () => {
    // Create Fastify app
    app = Fastify();
    await app.register(jwt, { secret: env.JWT_SECRET });
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(usersRoutes, { prefix: '/users' });
    await app.ready();

    // Create test user 1 (main test user)
    const passwordHash = await hashPassword(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        username: testUsername,
        passwordHash,
      },
    });
    testUserId = user.id;

    // Generate access token for test user 1
    testAccessToken = app.jwt.sign({
      userId: testUserId,
      email: testEmail,
      username: testUsername,
    });

    // Create test user 2 (for search tests)
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
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: testUserId },
          { id: user2Id },
          { email: testEmail },
          { email: testEmail2 },
        ],
      },
    });
    await app.close();
  });

  // Profile Management Tests
  describe('GET /users/me', () => {
    it('should get current user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe(testEmail);
      expect(body.user.username).toBe(testUsername);
      expect(body.user.passwordHash).toBeUndefined();
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update username', async () => {
      const newUsername = `updated${testUsername}`;
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          username: newUsername,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.username).toBe(newUsername);

      // Restore original username
      await prisma.user.update({
        where: { id: testUserId },
        data: { username: testUsername },
      });
    });

    it('should reject duplicate username', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-${testEmail}`,
          username: `another${testUsername}`,
          passwordHash: await hashPassword(testPassword),
        },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          username: anotherUser.username,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Username already taken');

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        payload: {
          username: 'newusername',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /users/me/avatar', () => {
    it('should update avatar URL', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';
      const response = await app.inject({
        method: 'POST',
        url: '/users/me/avatar',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          avatarUrl,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.avatarUrl).toBe(avatarUrl);
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users/me/avatar',
        payload: {
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /users/me/password', () => {
    it('should change password', async () => {
      const newPassword = 'newPassword456';
      const response = await app.inject({
        method: 'POST',
        url: '/users/me/password',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          currentPassword: testPassword,
          newPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Password changed successfully');

      // Verify all refresh tokens were revoked
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: testUserId },
      });
      expect(tokens.length).toBe(0);

      // Restore original password
      await prisma.user.update({
        where: { id: testUserId },
        data: { passwordHash: await hashPassword(testPassword) },
      });
    });

    it('should reject incorrect current password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users/me/password',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword456',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Current password is incorrect');
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users/me/password',
        payload: {
          currentPassword: testPassword,
          newPassword: 'newPassword456',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /users/me/settings', () => {
    it('should get user settings (create if not exists)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me/settings',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.settings).toBeDefined();
      expect(body.settings.voiceMode).toBe('push_to_talk');
      expect(body.settings.pttKey).toBe('Space');
      expect(body.settings.vadThreshold).toBe(0.5);
      expect(body.settings.noiseSuppression).toBe(true);
      expect(body.settings.echoCancellation).toBe(true);
      expect(body.settings.soundEffectsEnabled).toBe(true);
      expect(body.settings.notificationsEnabled).toBe(true);
      expect(body.settings.theme).toBe('dark');
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/me/settings',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /users/me/settings', () => {
    it('should update voice settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/settings',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          voiceMode: 'voice_activity',
          vadThreshold: 0.7,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.settings.voiceMode).toBe('voice_activity');
      expect(body.settings.vadThreshold).toBe(0.7);
    });

    it('should update UI settings', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/settings',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          soundEffectsEnabled: false,
          notificationsEnabled: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.settings.soundEffectsEnabled).toBe(false);
      expect(body.settings.notificationsEnabled).toBe(false);
    });

    it('should update theme', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/settings',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
        payload: {
          theme: 'light',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.settings.theme).toBe('light');
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me/settings',
        payload: {
          theme: 'light',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /users/me', () => {
    it('should delete user account', async () => {
      // Create a temporary user for deletion test
      const tempUser = await prisma.user.create({
        data: {
          email: `temp-${Date.now()}@example.com`,
          username: `temp${Date.now()}`,
          passwordHash: await hashPassword(testPassword),
        },
      });

      const tempToken = app.jwt.sign({
        userId: tempUser.id,
        email: tempUser.email,
        username: tempUser.username,
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${tempToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Account deleted successfully');

      // Verify user was deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: tempUser.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should reject unauthenticated request', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/users/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // User Search Tests
  describe('GET /users/search', () => {
    it('should search users by username', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/search?query=${testUsername2}`,
        headers: {
          authorization: `Bearer ${testAccessToken}`,
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
        url: `/users/search?query=${testEmail2}`,
        headers: {
          authorization: `Bearer ${testAccessToken}`,
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
        url: `/users/search?query=usertest`,
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);

      // Should not include testUserId (current user)
      const hasCurrentUser = body.users.some((u: any) => u.id === testUserId);
      expect(hasCurrentUser).toBe(false);
    });

    it('should return empty array for no matches', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/search?query=nonexistentuser12345',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
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
        url: '/users/search?query=usertest&limit=1',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
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
        url: '/users/search?query=test',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject search without query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/search',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${user2Id}`,
        headers: {
          authorization: `Bearer ${testAccessToken}`,
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
        url: '/users/nonexistent-id-12345',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('User not found');
    });

    it('should reject request without authorization', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${user2Id}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
