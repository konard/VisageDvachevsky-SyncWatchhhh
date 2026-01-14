/**
 * Reactions API Routes
 */

import { FastifyInstance } from 'fastify';
import { ReactionsService } from './service.js';
import { authenticateRequired } from '../../common/middleware/auth.js';

const reactionsService = new ReactionsService();

export async function reactionsRoutes(fastify: FastifyInstance) {
  // Get timeline reactions for a room
  fastify.get('/reactions/timeline/:roomId', {
    preHandler: authenticateRequired,
    schema: {
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          interval: { type: 'number', default: 30000 },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { roomId } = request.params as { roomId: string };
        const { interval } = request.query as { interval?: number };

        const timelineReactions = await reactionsService.getTimelineReactions(
          roomId,
          interval
        );

        // Convert Map to plain object
        const reactions = timelineReactions.map(tr => ({
          mediaTimeMs: tr.mediaTimeMs,
          reactions: Object.fromEntries(tr.reactions),
        }));

        return reply.status(200).send({ reactions });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            error: 'Internal Server Error',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Get reactions in a specific time range
  fastify.get('/reactions/range/:roomId', {
    preHandler: authenticateRequired,
    schema: {
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        required: ['startMs', 'endMs'],
        properties: {
          startMs: { type: 'number' },
          endMs: { type: 'number' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { roomId } = request.params as { roomId: string };
        const { startMs, endMs } = request.query as { startMs: number; endMs: number };

        const reactions = await reactionsService.getReactionsInRange(
          roomId,
          startMs,
          endMs
        );

        return reply.status(200).send({ reactions });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            error: 'Internal Server Error',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Get all reactions for a room
  fastify.get('/reactions/:roomId', {
    preHandler: authenticateRequired,
    schema: {
      params: {
        type: 'object',
        required: ['roomId'],
        properties: {
          roomId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 100 },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { roomId } = request.params as { roomId: string };
        const { limit } = request.query as { limit?: number };

        const reactions = await reactionsService.getRoomReactions(roomId, limit);

        return reply.status(200).send({ reactions });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(500).send({
            error: 'Internal Server Error',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });
}
