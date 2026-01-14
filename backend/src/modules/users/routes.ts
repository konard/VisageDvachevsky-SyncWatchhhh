import { FastifyInstance } from 'fastify';
import { UsersService } from './service.js';
import { updateProfileSchema, changePasswordSchema, updateSettingsSchema } from './schemas.js';
import { authenticateUser } from '../../common/middleware/auth.js';

const usersService = new UsersService();

export async function usersRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get('/me', {
    preHandler: authenticateUser,
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const profile = await usersService.getProfile(request.user.userId);
        return reply.status(200).send({ user: profile });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Update current user profile
  fastify.patch('/me', {
    preHandler: authenticateUser,
    schema: {
      body: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
          email: { type: 'string', format: 'email' },
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

        const body = updateProfileSchema.parse(request.body);
        const profile = await usersService.updateProfile(request.user.userId, body);
        return reply.status(200).send({ user: profile });
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

  // Upload avatar
  fastify.post('/me/avatar', {
    preHandler: authenticateUser,
    schema: {
      body: {
        type: 'object',
        required: ['avatarUrl'],
        properties: {
          avatarUrl: { type: 'string', format: 'uri' },
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

        const body = request.body as { avatarUrl: string };
        const profile = await usersService.updateAvatar(request.user.userId, body.avatarUrl);
        return reply.status(200).send({ user: profile });
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

  // Change password
  fastify.post('/me/password', {
    preHandler: authenticateUser,
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8, maxLength: 72 },
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

        const body = changePasswordSchema.parse(request.body);
        await usersService.changePassword(request.user.userId, body);
        return reply.status(200).send({ message: 'Password changed successfully' });
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

  // Delete account
  fastify.delete('/me', {
    preHandler: authenticateUser,
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        await usersService.deleteAccount(request.user.userId);
        return reply.status(200).send({ message: 'Account deleted successfully' });
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

  // Get user settings
  fastify.get('/me/settings', {
    preHandler: authenticateUser,
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const settings = await usersService.getSettings(request.user.userId);
        return reply.status(200).send({ settings });
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(404).send({
            error: 'Not Found',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Update user settings
  fastify.patch('/me/settings', {
    preHandler: authenticateUser,
    schema: {
      body: {
        type: 'object',
        properties: {
          voiceMode: { type: 'string', enum: ['push_to_talk', 'voice_activity'] },
          pttKey: { type: 'string' },
          vadThreshold: { type: 'number', minimum: 0, maximum: 1 },
          noiseSuppression: { type: 'boolean' },
          echoCancellation: { type: 'boolean' },
          soundEffectsEnabled: { type: 'boolean' },
          notificationsEnabled: { type: 'boolean' },
          theme: { type: 'string', enum: ['dark', 'light', 'auto'] },
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

        const body = updateSettingsSchema.parse(request.body);
        const settings = await usersService.updateSettings(request.user.userId, body);
        return reply.status(200).send({ settings });
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
