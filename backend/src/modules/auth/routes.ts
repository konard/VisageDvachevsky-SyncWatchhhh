import { FastifyInstance } from 'fastify';
import { AuthService } from './service.js';
import { registerSchema, loginSchema, refreshSchema } from './schemas.js';
import { authenticateRequired } from '../../common/middleware/auth.js';
import { verifyRefreshToken, generateAccessToken, revokeRefreshToken } from '../../common/utils/jwt.js';
import { prisma } from '../../common/utils/prisma.js';
import { getClientIp } from '../../common/middleware/brute-force-protection.js';

const authService = new AuthService();

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 20 },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = registerSchema.parse(request.body);
        const ip = getClientIp(request);
        const result = await authService.register(body, ip);
        return reply.status(201).send(result);
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

  // Login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = loginSchema.parse(request.body);
        const ip = getClientIp(request);
        const result = await authService.login(body, ip);
        return reply.status(200).send(result);
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: error.message,
          });
        }
        throw error;
      }
    },
  });

  // Refresh access token
  fastify.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = refreshSchema.parse(request.body);
        const userId = await verifyRefreshToken(body.refreshToken);

        if (!userId) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token',
          });
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
          },
        });

        if (!user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not found',
          });
        }

        const accessToken = generateAccessToken({
          userId: user.id,
          email: user.email,
          username: user.username,
        });

        return reply.status(200).send({ accessToken });
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

  // Logout
  fastify.post('/logout', {
    preHandler: authenticateRequired,
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const body = refreshSchema.parse(request.body);
        await revokeRefreshToken(body.refreshToken);
        return reply.status(200).send({ message: 'Logged out successfully' });
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

  // Get current user
  fastify.get('/me', {
    preHandler: authenticateRequired,
    handler: async (request, reply) => {
      try {
        if (!request.user) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'User not authenticated',
          });
        }

        const user = await authService.getCurrentUser(request.user.userId);
        return reply.status(200).send({ user });
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
}
