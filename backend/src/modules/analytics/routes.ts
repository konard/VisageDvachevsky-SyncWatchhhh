/**
 * Analytics API Routes
 */

import { FastifyInstance } from 'fastify';
import { analyticsService, EventCategory } from './service.js';
import {
  TrackEventSchema,
  BatchTrackEventsSchema,
  DateRangeQuerySchema,
  GetEventsQuerySchema,
  ExportLogsQuerySchema,
} from './schemas.js';
import { prisma } from '../../database/client.js';
import { authMiddleware } from '../../common/middleware/auth.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/index.js';
import { Parser } from 'json2csv';

export async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * Track a single analytics event
   * Public endpoint (no auth required for guest tracking)
   */
  fastify.post(
    '/events',
    {
      schema: {
        body: TrackEventSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      await analyticsService.trackEvent(request.body);
      return { success: true };
    }
  );

  /**
   * Track multiple events in a batch
   * Public endpoint (no auth required for guest tracking)
   */
  fastify.post(
    '/events/batch',
    {
      schema: {
        body: BatchTrackEventsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { events } = request.body;

      // Track all events
      await Promise.all(
        events.map(event => analyticsService.trackEvent(event))
      );

      return { success: true, count: events.length };
    }
  );

  /**
   * Get funnel metrics
   * Requires authentication
   */
  fastify.get(
    '/metrics/funnel',
    {
      preHandler: authMiddleware(),
      schema: {
        querystring: DateRangeQuerySchema,
      },
    },
    async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const metrics = await analyticsService.getFunnelMetrics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      return { metrics };
    }
  );

  /**
   * Get voice join success rate metrics
   * Requires authentication
   */
  fastify.get(
    '/metrics/voice',
    {
      preHandler: authMiddleware(),
      schema: {
        querystring: DateRangeQuerySchema,
      },
    },
    async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const metrics = await analyticsService.getVoiceSuccessRate(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      return { metrics };
    }
  );

  /**
   * Get sync correction metrics
   * Requires authentication
   */
  fastify.get(
    '/metrics/sync',
    {
      preHandler: authMiddleware(),
      schema: {
        querystring: DateRangeQuerySchema,
      },
    },
    async (request, reply) => {
      const { startDate, endDate } = request.query as any;

      const metrics = await analyticsService.getSyncMetrics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      return { metrics };
    }
  );

  /**
   * Get analytics events
   * Requires authentication
   */
  fastify.get(
    '/events',
    {
      preHandler: authMiddleware(),
      schema: {
        querystring: GetEventsQuerySchema,
      },
    },
    async (request, reply) => {
      const query = request.query as any;

      const events = await analyticsService.getEvents({
        sessionId: query.sessionId,
        roomId: query.roomId,
        userId: query.userId,
        category: query.category as EventCategory | undefined,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
      });

      return { events };
    }
  );

  /**
   * Export logs for a room
   * Requires authentication and room ownership
   */
  fastify.get(
    '/export/logs',
    {
      preHandler: authMiddleware(),
      schema: {
        querystring: ExportLogsQuerySchema,
      },
    },
    async (request, reply) => {
      const user = (request as any).user;
      const { roomId, startDate, endDate, format = 'json' } = request.query as any;

      // Check if user is room owner
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { ownerId: true, code: true },
      });

      if (!room) {
        throw new NotFoundError('Room not found');
      }

      if (room.ownerId !== user.id) {
        throw new ForbiddenError('Only room owners can export logs');
      }

      // Collect all logs
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.timestamp = {};
        if (startDate) dateFilter.timestamp.gte = new Date(startDate);
        if (endDate) dateFilter.timestamp.lte = new Date(endDate);
      }

      const [analyticsEvents, syncCorrections, voiceAttempts, diagnostics, chatMessages] = await Promise.all([
        // Analytics events
        prisma.analyticsEvent.findMany({
          where: { roomId, ...dateFilter },
          orderBy: { timestamp: 'asc' },
        }),

        // Sync corrections
        prisma.syncCorrectionLog.findMany({
          where: { roomId, ...dateFilter },
          orderBy: { timestamp: 'asc' },
        }),

        // Voice attempts
        prisma.voiceJoinAttempt.findMany({
          where: { roomId, ...dateFilter },
          orderBy: { timestamp: 'asc' },
        }),

        // Diagnostics snapshots
        prisma.diagnosticsSnapshot.findMany({
          where: { roomId, ...dateFilter },
          orderBy: { timestamp: 'asc' },
        }),

        // Chat messages
        prisma.chatMessage.findMany({
          where: { roomId, ...dateFilter },
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { username: true },
            },
          },
        }),
      ]);

      const exportData = {
        roomCode: room.code,
        exportedAt: new Date().toISOString(),
        dateRange: {
          start: startDate || null,
          end: endDate || null,
        },
        summary: {
          analyticsEvents: analyticsEvents.length,
          syncCorrections: syncCorrections.length,
          voiceAttempts: voiceAttempts.length,
          diagnostics: diagnostics.length,
          chatMessages: chatMessages.length,
        },
        data: {
          analyticsEvents,
          syncCorrections,
          voiceAttempts,
          diagnostics,
          chatMessages,
        },
      };

      if (format === 'csv') {
        // Convert to CSV (flatten the data)
        const fields = [
          'timestamp',
          'type',
          'eventName',
          'userId',
          'sessionId',
          'details',
        ];

        const flatData = [
          ...analyticsEvents.map(e => ({
            timestamp: e.timestamp,
            type: 'analytics',
            eventName: e.eventName,
            userId: e.userId || '',
            sessionId: e.sessionId,
            details: JSON.stringify(e.properties),
          })),
          ...syncCorrections.map(s => ({
            timestamp: s.timestamp,
            type: 'sync_correction',
            eventName: s.correctionType,
            userId: s.userId || '',
            sessionId: s.sessionId,
            details: `drift=${s.driftMs}ms`,
          })),
          ...voiceAttempts.map(v => ({
            timestamp: v.timestamp,
            type: 'voice_attempt',
            eventName: v.success ? 'success' : 'failure',
            userId: v.userId || '',
            sessionId: v.sessionId,
            details: v.failureReason || `joinTime=${v.joinTimeMs}ms`,
          })),
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(flatData);

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="room-${room.code}-logs.csv"`);
        return csv;
      } else {
        // Return JSON
        reply.header('Content-Type', 'application/json');
        reply.header('Content-Disposition', `attachment; filename="room-${room.code}-logs.json"`);
        return exportData;
      }
    }
  );
}
