import { FastifyInstance } from 'fastify';
import { FriendsService } from './service.js';
import { sendFriendRequestSchema, friendIdParamSchema } from './schemas.js';
import { authenticateRequired } from '../../common/middleware/auth.js';

const friendsService = new FriendsService();

export async function friendsRoutes(fastify: FastifyInstance) {
  // Get all friends
  fastify.get('/friends', {
    preHandler: [authenticateRequired],
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const friends = await friendsService.getFriends(request.user.userId);
        return reply.status(200).send({ friends });
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

  // Get pending friend requests
  fastify.get('/friends/requests', {
    preHandler: [authenticateRequired],
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const requests = await friendsService.getPendingRequests(request.user.userId);
        return reply.status(200).send({ requests });
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

  // Send friend request
  fastify.post('/friends/request', {
    preHandler: [authenticateRequired],
    schema: {
      body: {
        type: 'object',
        required: ['addresseeId'],
        properties: {
          addresseeId: { type: 'string' },
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

        const body = sendFriendRequestSchema.parse(request.body);
        const friendship = await friendsService.sendFriendRequest(request.user.userId, body);
        return reply.status(201).send({ friendship });
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

  // Accept friend request
  fastify.post('/friends/accept/:id', {
    preHandler: [authenticateRequired],
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

        const params = friendIdParamSchema.parse(request.params);
        const friendship = await friendsService.acceptFriendRequest(request.user.userId, params.id);
        return reply.status(200).send({ friendship });
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

  // Decline friend request
  fastify.delete('/friends/decline/:id', {
    preHandler: [authenticateRequired],
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

        const params = friendIdParamSchema.parse(request.params);
        await friendsService.declineFriendRequest(request.user.userId, params.id);
        return reply.status(200).send({ message: 'Friend request declined' });
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

  // Remove friend
  fastify.delete('/friends/:id', {
    preHandler: [authenticateRequired],
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

        const params = friendIdParamSchema.parse(request.params);
        await friendsService.removeFriend(request.user.userId, params.id);
        return reply.status(200).send({ message: 'Friend removed' });
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

  // Block user
  fastify.post('/friends/block/:id', {
    preHandler: [authenticateRequired],
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

        const params = friendIdParamSchema.parse(request.params);
        await friendsService.blockUser(request.user.userId, params.id);
        return reply.status(200).send({ message: 'User blocked' });
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
}
