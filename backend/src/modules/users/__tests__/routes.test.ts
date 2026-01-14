import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { usersRoutes } from '../routes.js';
import { prisma } from '../../../common/utils/prisma.js';
import { hashPassword } from '../../../common/utils/password.js';
import { env } from '../../../config/env.js';

describe('Users Routes Integration', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let testAccessToken: string;
  const testEmail = `usertest-${Date.now()}@example.com`;
  const testUsername = `usertest${Date.now()}`;
  const testPassword = 'testPassword123';

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        username: testUsername,
        passwordHash,
      },
    });
    testUserId = user.id;

    // Create Fastify app
    app = Fastify();
    await app.register(jwt, { secret: env.JWT_SECRET });
    await app.register(usersRoutes, { prefix: '/users' });
    await app.ready();

    // Generate access token for test user
    testAccessToken = app.jwt.sign({
      userId: testUserId,
      email: testEmail,
      username: testUsername,
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await app.close();
  });

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
});
