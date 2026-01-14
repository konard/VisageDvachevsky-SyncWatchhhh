import { FastifyInstance } from 'fastify';
import { UsersService } from './service.js';
import { searchUsersSchema } from './schemas.js';
import { authenticateUser } from '../../common/middleware/auth.js';

const usersService = new UsersService();

export async function usersRoutes(fastify: FastifyInstance) {
  // Search users
  fastify.get('/users/search', {
    preHandler: authenticateUser,
    schema: {
      querystring: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
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

        const queryParams = searchUsersSchema.parse(request.query);
        const users = await usersService.searchUsers(queryParams, request.user.userId);
        return reply.status(200).send({ users });
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

  // Get user by ID
  fastify.get('/users/:id', {
    preHandler: authenticateUser,
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
        const user = await usersService.getUserById(id);

        if (!user) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        return reply.status(200).send({ user });
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
