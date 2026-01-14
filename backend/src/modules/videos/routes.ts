/**
 * Video Routes
 * API endpoints for video upload and status
 */

import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { VideoService } from './service.js';
import { authenticateRequired } from '../../common/middleware/auth.js';
import { BadRequestError } from '../../common/errors/index.js';
import { getClientIp } from '../../common/middleware/brute-force-protection.js';

const videoService = new VideoService();

export async function videoRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024 * 1024, // 8GB
      files: 1, // Only one file per request
    },
  });

  /**
   * POST /api/videos/upload
   * Upload a video file
   */
  fastify.post('/upload', {
    preHandler: authenticateRequired,
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        // Get uploaded file
        const data = await request.file();

        if (!data) {
          throw new BadRequestError('No file uploaded');
        }

        // Get client IP
        const ip = getClientIp(request);

        // Process upload with security validation
        const result = await videoService.uploadVideo(request.user.userId, data, ip);

        return reply.status(201).send(result);
      } catch (error) {
        // Handle known error types
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (error as any).statusCode || 500;
          return reply.status(statusCode).send({
            error: error.name,
            message: error.message,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            details: (error as any).details,
          });
        }
        throw error;
      }
    },
  });

  /**
   * GET /api/videos/:id/status
   * Get video transcoding status
   */
  fastify.get('/:id/status', {
    preHandler: authenticateRequired,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const { id } = request.params as { id: string };

        const status = await videoService.getVideoStatus(id, request.user.userId);

        return reply.status(200).send(status);
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusCode = (error as any).statusCode || 500;
          return reply.status(statusCode).send({
            error: error.name,
            message: error.message,
          });
        }
        throw error;
      }
    },
  });
}
