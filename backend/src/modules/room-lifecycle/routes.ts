/**
 * Room Lifecycle Routes
 * HTTP endpoints for smart ownership and room lifecycle features
 */

import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { authenticateRequired } from '../../common/middleware/auth.js';
import { ValidationError } from '../../common/errors/index.js';
import {
  TemporaryHostService,
  VotingService,
  ScheduledRoomService,
  RoomHistoryService,
  RoomTemplateService,
} from './index.js';
import * as schemas from './schemas.js';

const tempHostService = new TemporaryHostService();
const votingService = new VotingService();
const scheduledRoomService = new ScheduledRoomService();
const historyService = new RoomHistoryService();
const templateService = new RoomTemplateService();

/**
 * Register room lifecycle routes
 */
export async function registerRoomLifecycleRoutes(app: FastifyInstance) {
  // ============================================
  // Temporary Host Routes
  // ============================================

  // POST /api/rooms/:roomId/temporary-host - Grant temporary host
  app.post<{
    Params: { roomId: string };
    Body: schemas.GrantTemporaryHostInput;
  }>(
    '/api/rooms/:roomId/temporary-host',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      try {
        const input = schemas.grantTemporaryHostSchema.parse(request.body);
        const session = await tempHostService.grantTemporaryHost(
          request.user!.userId,
          { ...input, roomId: request.params.roomId }
        );

        return reply.code(201).send({
          success: true,
          data: session,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', { errors: error.errors });
        }
        throw error;
      }
    }
  );

  // DELETE /api/rooms/:roomId/temporary-host/:userId - Revoke temporary host
  app.delete<{
    Params: { roomId: string; userId: string };
  }>(
    '/api/rooms/:roomId/temporary-host/:userId',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      await tempHostService.revokeTemporaryHost(
        request.user!.userId,
        request.params.roomId,
        request.params.userId
      );

      return reply.send({
        success: true,
        message: 'Temporary host revoked',
      });
    }
  );

  // GET /api/rooms/:roomId/temporary-hosts - Get active temporary hosts
  app.get<{
    Params: { roomId: string };
  }>(
    '/api/rooms/:roomId/temporary-hosts',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const hosts = await tempHostService.getActiveHosts(request.params.roomId);

      return reply.send({
        success: true,
        data: hosts,
      });
    }
  );

  // ============================================
  // Voting Routes
  // ============================================

  // POST /api/rooms/:roomId/vote - Initiate vote
  app.post<{
    Params: { roomId: string };
    Body: schemas.InitiateVoteInput;
  }>(
    '/api/rooms/:roomId/vote',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      try {
        const input = schemas.initiateVoteSchema.parse(request.body);
        const vote = await votingService.initiatePlaybackVote(
          request.params.roomId,
          request.user!.userId,
          input.type
        );

        return reply.code(201).send({
          success: true,
          data: vote,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', { errors: error.errors });
        }
        throw error;
      }
    }
  );

  // POST /api/votes/:voteId/cast - Cast vote
  app.post<{
    Params: { voteId: string };
    Body: schemas.CastVoteInput;
  }>(
    '/api/votes/:voteId/cast',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      try {
        const input = schemas.castVoteSchema.parse(request.body);
        const vote = await votingService.castVote(
          request.params.voteId,
          request.user!.userId,
          input.choice
        );

        return reply.send({
          success: true,
          data: vote,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', { errors: error.errors });
        }
        throw error;
      }
    }
  );

  // GET /api/rooms/:roomId/vote - Get active vote
  app.get<{
    Params: { roomId: string };
  }>(
    '/api/rooms/:roomId/vote',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const vote = await votingService.getActiveVote(request.params.roomId);

      return reply.send({
        success: true,
        data: vote,
      });
    }
  );

  // ============================================
  // Scheduled Room Routes
  // ============================================

  // POST /api/scheduled-rooms - Create scheduled room
  app.post<{
    Body: schemas.CreateScheduledRoomInput;
  }>(
    '/api/scheduled-rooms',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      try {
        const input = schemas.createScheduledRoomSchema.parse(request.body);
        const room = await scheduledRoomService.createScheduledRoom(
          request.user!.userId,
          input
        );

        return reply.code(201).send({
          success: true,
          data: room,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', { errors: error.errors });
        }
        throw error;
      }
    }
  );

  // GET /api/scheduled-rooms - Get user's scheduled rooms
  app.get(
    '/api/scheduled-rooms',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const rooms = await scheduledRoomService.getUserScheduledRooms(
        request.user!.userId
      );

      return reply.send({
        success: true,
        data: rooms,
      });
    }
  );

  // GET /api/scheduled-rooms/:id - Get scheduled room
  app.get<{
    Params: { id: string };
  }>(
    '/api/scheduled-rooms/:id',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const room = await scheduledRoomService.getScheduledRoom(request.params.id);

      return reply.send({
        success: true,
        data: room,
      });
    }
  );

  // PATCH /api/scheduled-rooms/:id - Update scheduled room
  app.patch<{
    Params: { id: string };
    Body: Partial<schemas.CreateScheduledRoomInput>;
  }>(
    '/api/scheduled-rooms/:id',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const room = await scheduledRoomService.updateScheduledRoom(
        request.params.id,
        request.user!.userId,
        request.body
      );

      return reply.send({
        success: true,
        data: room,
      });
    }
  );

  // DELETE /api/scheduled-rooms/:id - Cancel scheduled room
  app.delete<{
    Params: { id: string };
  }>(
    '/api/scheduled-rooms/:id',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      await scheduledRoomService.cancelScheduledRoom(
        request.params.id,
        request.user!.userId
      );

      return reply.send({
        success: true,
        message: 'Scheduled room cancelled',
      });
    }
  );

  // ============================================
  // Room History Routes
  // ============================================

  // GET /api/history - Get watch history
  app.get<{
    Querystring: { limit?: string; offset?: string };
  }>(
    '/api/history',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const limit = request.query.limit ? parseInt(request.query.limit) : 20;
      const offset = request.query.offset ? parseInt(request.query.offset) : 0;

      const history = await historyService.getWatchHistory(
        request.user!.userId,
        limit,
        offset
      );

      const total = await historyService.getHistoryCount(request.user!.userId);

      return reply.send({
        success: true,
        data: history,
        pagination: {
          limit,
          offset,
          total,
        },
      });
    }
  );

  // PATCH /api/history/:id/hide - Hide history entry
  app.patch<{
    Params: { id: string };
  }>(
    '/api/history/:id/hide',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      await historyService.hideHistoryEntry(request.params.id, request.user!.userId);

      return reply.send({
        success: true,
        message: 'History entry hidden',
      });
    }
  );

  // DELETE /api/history/:id - Delete history entry
  app.delete<{
    Params: { id: string };
  }>(
    '/api/history/:id',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      await historyService.deleteHistoryEntry(request.params.id, request.user!.userId);

      return reply.send({
        success: true,
        message: 'History entry deleted',
      });
    }
  );

  // ============================================
  // Room Template Routes
  // ============================================

  // POST /api/templates - Create template
  app.post<{
    Body: schemas.CreateRoomTemplateInput;
  }>(
    '/api/templates',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      try {
        const input = schemas.createTemplateSchema.parse(request.body);
        const template = await templateService.createTemplate(
          request.user!.userId,
          input
        );

        return reply.code(201).send({
          success: true,
          data: template,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ValidationError('Validation failed', { errors: error.errors });
        }
        throw error;
      }
    }
  );

  // GET /api/templates - Get user's templates
  app.get(
    '/api/templates',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const templates = await templateService.getUserTemplates(request.user!.userId);

      return reply.send({
        success: true,
        data: templates,
      });
    }
  );

  // GET /api/templates/default - Get default template
  app.get(
    '/api/templates/default',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const template = await templateService.getDefaultTemplate(request.user!.userId);

      return reply.send({
        success: true,
        data: template,
      });
    }
  );

  // PATCH /api/templates/:id - Update template
  app.patch<{
    Params: { id: string };
    Body: Partial<schemas.CreateRoomTemplateInput>;
  }>(
    '/api/templates/:id',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const template = await templateService.updateTemplate(
        request.params.id,
        request.user!.userId,
        request.body
      );

      return reply.send({
        success: true,
        data: template,
      });
    }
  );

  // DELETE /api/templates/:id - Delete template
  app.delete<{
    Params: { id: string };
  }>(
    '/api/templates/:id',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      await templateService.deleteTemplate(request.params.id, request.user!.userId);

      return reply.send({
        success: true,
        message: 'Template deleted',
      });
    }
  );

  // POST /api/templates/:id/set-default - Set as default
  app.post<{
    Params: { id: string };
  }>(
    '/api/templates/:id/set-default',
    { preHandler: [authenticateRequired] },
    async (request, reply) => {
      const template = await templateService.setAsDefault(
        request.params.id,
        request.user!.userId
      );

      return reply.send({
        success: true,
        data: template,
      });
    }
  );
}
