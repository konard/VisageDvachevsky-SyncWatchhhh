/**
 * Moderation Routes
 * API endpoints for abuse protection and moderation
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ModerationService } from './service.js';
import {
  createReportSchema,
  updateReportStatusSchema,
  muteUserSchema,
  shadowMuteSchema,
  type CreateReportInput,
  type UpdateReportStatusInput,
  type MuteUserInput,
  type ShadowMuteInput,
} from './schemas.js';

const moderationService = new ModerationService();

export async function moderationRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/moderation/reports
   * Create a user report
   */
  fastify.post<{
    Body: CreateReportInput;
  }>(
    '/reports',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Report a user for abuse or misconduct',
        body: createReportSchema,
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: CreateReportInput }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const report = await moderationService.createReport(userId, request.body);

      return reply.code(201).send({
        success: true,
        data: report,
      });
    }
  );

  /**
   * GET /api/moderation/reports
   * Get all reports (moderator only)
   */
  fastify.get<{
    Querystring: {
      status?: string;
      reportedUserId?: string;
      limit?: number;
    };
  }>(
    '/reports',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Get all user reports (moderator only)',
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply: FastifyReply) => {
      // TODO: Add moderator role check in production
      const reports = await moderationService.getReports(request.query);

      return reply.send({
        success: true,
        data: reports,
      });
    }
  );

  /**
   * PATCH /api/moderation/reports/:reportId
   * Update report status (moderator only)
   */
  fastify.patch<{
    Params: { reportId: string };
    Body: UpdateReportStatusInput;
  }>(
    '/reports/:reportId',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Update report status (moderator only)',
        body: updateReportStatusSchema,
      },
      preHandler: [fastify.authenticate],
    },
    async (
      request: FastifyRequest<{
        Params: { reportId: string };
        Body: UpdateReportStatusInput;
      }>,
      reply: FastifyReply
    ) => {
      // TODO: Add moderator role check in production
      const userId = request.user!.userId;
      const report = await moderationService.updateReportStatus(
        request.params.reportId,
        userId,
        request.body
      );

      return reply.send({
        success: true,
        data: report,
      });
    }
  );

  /**
   * POST /api/moderation/mute
   * Temporarily mute a user
   */
  fastify.post<{
    Body: MuteUserInput;
  }>(
    '/mute',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Temporarily mute a user in a room',
        body: muteUserSchema,
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: MuteUserInput }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await moderationService.muteUser(userId, request.body);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * DELETE /api/moderation/mute
   * Unmute a user
   */
  fastify.delete<{
    Querystring: {
      roomId: string;
      userId: string;
    };
  }>(
    '/mute',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Remove mute from a user',
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply: FastifyReply) => {
      const { roomId, userId } = request.query;
      const result = await moderationService.unmuteUser(roomId, userId);

      return reply.send({
        success: true,
        unmuted: result,
      });
    }
  );

  /**
   * POST /api/moderation/shadow-mute
   * Shadow mute a user (admin only)
   */
  fastify.post<{
    Body: ShadowMuteInput;
  }>(
    '/shadow-mute',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Shadow mute a user (admin only)',
        body: shadowMuteSchema,
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Body: ShadowMuteInput }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const result = await moderationService.shadowMute(userId, request.body);

      return reply.send({
        success: true,
        shadowMuted: result,
      });
    }
  );

  /**
   * DELETE /api/moderation/shadow-mute
   * Remove shadow mute from a user
   */
  fastify.delete<{
    Querystring: {
      roomId: string;
      userId: string;
    };
  }>(
    '/shadow-mute',
    {
      schema: {
        tags: ['Moderation'],
        description: 'Remove shadow mute from a user',
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply: FastifyReply) => {
      const { roomId, userId } = request.query;
      const result = await moderationService.removeShadowMute(roomId, userId);

      return reply.send({
        success: true,
        removed: result,
      });
    }
  );
}
