/**
 * Room API Integration Tests
 * Tests for room endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { registerRoomRoutes, setupErrorHandler } from '../routes.js';
import { prisma } from '../../../database/client.js';

describe('Room API Integration Tests', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    // Setup test app
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-secret' });
    setupErrorHandler(app);
    await registerRoomRoutes(app);

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed',
      },
    });
    testUserId = testUser.id;

    // Generate test token
    testToken = app.jwt.sign({
      userId: testUserId,
      email: testUser.email,
      username: testUser.username,
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.roomParticipant.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /api/rooms', () => {
    it('should create a room', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Test Room',
          maxParticipants: 4,
          playbackControl: 'owner_only',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Test Room');
      expect(body.data.code).toHaveLength(8);
      expect(body.data.maxParticipants).toBe(4);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        payload: {
          name: 'Test Room',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create room with password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Protected Room',
          password: 'secret123',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.hasPassword).toBe(true);
    });
  });

  describe('GET /api/rooms/:code', () => {
    it('should get room information', async () => {
      // Create a room first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Info Test Room',
        },
      });

      const { code } = JSON.parse(createResponse.body).data;

      // Get room info
      const response = await app.inject({
        method: 'GET',
        url: `/api/rooms/${code}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Info Test Room');
      expect(body.data.participantCount).toBe(1);
    });

    it('should return 404 for non-existent room', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/rooms/INVALID1',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/rooms/:code/join', () => {
    it('should join a room without password', async () => {
      // Create a room
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Join Test Room',
        },
      });

      const { code } = JSON.parse(createResponse.body).data;

      // Join as guest
      const response = await app.inject({
        method: 'POST',
        url: `/api/rooms/${code}/join`,
        payload: {
          guestName: 'Guest User',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.participant.role).toBe('guest');
    });

    it('should require password for protected rooms', async () => {
      // Create protected room
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Protected Room',
          password: 'secret123',
        },
      });

      const { code } = JSON.parse(createResponse.body).data;

      // Try to join without password
      const response = await app.inject({
        method: 'POST',
        url: `/api/rooms/${code}/join`,
        payload: {
          guestName: 'Guest',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should join with correct password', async () => {
      // Create protected room
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Protected Room 2',
          password: 'secret456',
        },
      });

      const { code } = JSON.parse(createResponse.body).data;

      // Join with correct password
      const response = await app.inject({
        method: 'POST',
        url: `/api/rooms/${code}/join`,
        payload: {
          password: 'secret456',
          guestName: 'Guest',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/rooms/:code', () => {
    it('should allow owner to delete room', async () => {
      // Create a room
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Delete Test Room',
        },
      });

      const { code } = JSON.parse(createResponse.body).data;

      // Delete room
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/rooms/${code}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/rooms/TESTCODE',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/rooms/:code', () => {
    it('should allow owner to update room settings', async () => {
      // Create a room
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/rooms',
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Update Test Room',
        },
      });

      const { code } = JSON.parse(createResponse.body).data;

      // Update room
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/rooms/${code}`,
        headers: {
          authorization: `Bearer ${testToken}`,
        },
        payload: {
          name: 'Updated Name',
          playbackControl: 'all',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.playbackControl).toBe('all');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/rooms/TESTCODE',
        payload: {
          name: 'New Name',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
