/**
 * Presence API Routes
 */

import { FastifyInstance } from 'fastify';
import { PresenceService } from './service.js';
import { authenticateRequired } from '../../common/middleware/auth.js';
import { z } from 'zod';
import { prisma } from '../../common/utils/prisma.js';

const presenceService = new PresenceService();

const SetInvisibleModeSchema = z.object({
  enabled: z.boolean(),
});

const UpdateSettingsSchema = z.object({
  showRichPresence: z.boolean().optional(),
  allowFriendJoin: z.boolean().optional(),
});

export async function presenceRoutes(fastify: FastifyInstance) {
  // Get friends currently in rooms
  fastify.get('/presence/friends-in-rooms', {
    preHandler: authenticateRequired,
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const friendsInRooms = await presenceService.getFriendsInRooms(request.user.userId);
        return reply.status(200).send({ friends: friendsInRooms });
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

  // Set invisible mode
  fastify.post('/presence/invisible', {
    preHandler: authenticateRequired,
    schema: {
      body: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: { type: 'boolean' },
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

        const { enabled } = SetInvisibleModeSchema.parse(request.body);
        await presenceService.setInvisibleMode(request.user.userId, enabled);

        return reply.status(200).send({
          message: `Invisible mode ${enabled ? 'enabled' : 'disabled'}`,
        });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Update presence settings
  fastify.patch('/presence/settings', {
    preHandler: authenticateRequired,
    schema: {
      body: {
        type: 'object',
        properties: {
          showRichPresence: { type: 'boolean' },
          allowFriendJoin: { type: 'boolean' },
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

        const settings = UpdateSettingsSchema.parse(request.body);

        // Update settings in database
        await prisma.userSettings.update({
          where: { userId: request.user.userId },
          data: settings,
        });

        return reply.status(200).send({
          message: 'Settings updated',
        });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Get presence for a specific user
  fastify.get('/presence/user/:userId', {
    preHandler: authenticateRequired,
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
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

        const { userId } = request.params as { userId: string };
        const presence = await presenceService.getPresenceForUser(
          userId,
          request.user.userId
        );

        return reply.status(200).send({ presence });
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

  // Get rich presence for a user
  fastify.get('/presence/rich/:userId', {
    preHandler: authenticateRequired,
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
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

        const { userId } = request.params as { userId: string };
        const richPresence = await presenceService.getRichPresence(userId);

        return reply.status(200).send({ richPresence });
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
