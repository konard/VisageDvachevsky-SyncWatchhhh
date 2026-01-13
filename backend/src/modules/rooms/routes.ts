/**
 * Room Routes
 * HTTP endpoints for room management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { RoomService } from './service.js';
import {
  createRoomSchema,
  joinRoomSchema,
  updateRoomSchema,
  CreateRoomInput,
  JoinRoomInput,
  UpdateRoomInput,
} from './schemas.js';
import {
  authenticateRequired,
  authenticateOptional,
} from '../../common/middleware/auth.js';
import {
  ValidationError,
  AppError,
} from '../../common/errors/index.js';

const roomService = new RoomService();

/**
 * Register room routes
 */
export async function registerRoomRoutes(app: FastifyInstance) {
  // POST /api/rooms - Create a new room (authenticated)
  app.post(
    '/api/rooms',
    {
      preHandler: [authenticateRequired],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const input = createRoomSchema.parse(request.body);
        const room = await roomService.createRoom(request.user!.userId, input);

        return reply.code(201).send({
          success: true,
          data: {
            id: room.id,
            code: room.code,
            name: room.name,
            ownerId: room.ownerId,
            maxParticipants: room.maxParticipants,
            playbackControl: room.playbackControl,
            hasPassword: !!room.passwordHash,
            createdAt: room.createdAt,
            expiresAt: room.expiresAt,
          },
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', {
            errors: error.errors,
          });
        }
        throw error;
      }
    }
  );

  // GET /api/rooms/:code - Get room information
  app.get(
    '/api/rooms/:code',
    {
      preHandler: [authenticateOptional],
    },
    async (
      request: FastifyRequest<{ Params: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;
      const { room, participants } = await roomService.getRoomWithParticipants(
        code
      );

      return reply.send({
        success: true,
        data: {
          id: room.id,
          code: room.code,
          name: room.name,
          ownerId: room.ownerId,
          maxParticipants: room.maxParticipants,
          playbackControl: room.playbackControl,
          hasPassword: !!room.passwordHash,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          participantCount: participants.length,
          participants: participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            username: p.username,
            avatarUrl: p.avatarUrl,
            role: p.role,
            joinedAt: p.joinedAt,
          })),
        },
      });
    }
  );

  // POST /api/rooms/:code/join - Join a room
  app.post(
    '/api/rooms/:code/join',
    {
      preHandler: [authenticateOptional],
    },
    async (
      request: FastifyRequest<{
        Params: { code: string };
        Body: JoinRoomInput;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { code } = request.params;
        const input = joinRoomSchema.parse(request.body);
        const userId = request.user?.userId;

        const { room, participant } = await roomService.joinRoom(
          code,
          input,
          userId
        );

        return reply.code(200).send({
          success: true,
          data: {
            room: {
              id: room.id,
              code: room.code,
              name: room.name,
              ownerId: room.ownerId,
              maxParticipants: room.maxParticipants,
              playbackControl: room.playbackControl,
              hasPassword: !!room.passwordHash,
              createdAt: room.createdAt,
              expiresAt: room.expiresAt,
            },
            participant: {
              id: participant.id,
              userId: participant.userId,
              role: participant.role,
              canControl: participant.canControl,
              joinedAt: participant.joinedAt,
            },
          },
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', {
            errors: error.errors,
          });
        }
        throw error;
      }
    }
  );

  // POST /api/rooms/:code/leave - Leave a room (authenticated)
  app.post(
    '/api/rooms/:code/leave',
    {
      preHandler: [authenticateRequired],
    },
    async (
      request: FastifyRequest<{ Params: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;
      await roomService.leaveRoom(code, request.user!.userId);

      return reply.code(200).send({
        success: true,
        data: { message: 'Left room successfully' },
      });
    }
  );

  // DELETE /api/rooms/:code - Delete a room (owner only)
  app.delete(
    '/api/rooms/:code',
    {
      preHandler: [authenticateRequired],
    },
    async (
      request: FastifyRequest<{ Params: { code: string } }>,
      reply: FastifyReply
    ) => {
      const { code } = request.params;
      await roomService.deleteRoom(code, request.user!.userId);

      return reply.code(200).send({
        success: true,
        data: { message: 'Room deleted successfully' },
      });
    }
  );

  // PATCH /api/rooms/:code - Update room settings (owner only)
  app.patch(
    '/api/rooms/:code',
    {
      preHandler: [authenticateRequired],
    },
    async (
      request: FastifyRequest<{
        Params: { code: string };
        Body: UpdateRoomInput;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { code } = request.params;
        const input = updateRoomSchema.parse(request.body);

        const room = await roomService.updateRoom(
          code,
          request.user!.userId,
          input
        );

        return reply.code(200).send({
          success: true,
          data: {
            id: room.id,
            code: room.code,
            name: room.name,
            ownerId: room.ownerId,
            maxParticipants: room.maxParticipants,
            playbackControl: room.playbackControl,
            hasPassword: !!room.passwordHash,
            createdAt: room.createdAt,
            expiresAt: room.expiresAt,
          },
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', {
            errors: error.errors,
          });
        }
        throw error;
      }
    }
  );
}

/**
 * Error handler for room routes
 */
export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Log unexpected errors
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
}
