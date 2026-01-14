/**
 * Video Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { videoRoutes } from '../routes.js';
import jwt from '@fastify/jwt';
import { env } from '../../../config/env.js';

describe('Video Routes', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let token: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(jwt, {
      secret: env.JWT_SECRET,
    });
    await app.register(videoRoutes, { prefix: '/videos' });

    // Generate a test token
    token = app.jwt.sign({
      userId: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /videos/upload', () => {
    it('should reject requests without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/videos/upload',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject requests without file', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/videos/upload',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      // @fastify/multipart returns 406 when Content-Type is not multipart/form-data
      expect(response.statusCode).toBe(406);
    });
  });

  describe('GET /videos/:id/status', () => {
    it('should reject requests without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/videos/test-video-id/status',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent video', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/videos/non-existent-id/status',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
