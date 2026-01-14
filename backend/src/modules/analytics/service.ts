/**
 * Analytics Service
 * Manages product analytics event collection, batching, and querying
 */

import { prisma } from '../../database/client.js';
import { redis } from '../../database/redis.js';
import { logger } from '../../config/logger.js';
import type { Prisma } from '@prisma/client';

/**
 * Event categories for analytics
 */
export enum EventCategory {
  SESSION = 'session',
  SYNC = 'sync',
  VOICE = 'voice',
  CHAT = 'chat',
  FUNNEL = 'funnel',
}

/**
 * Standard event names
 */
export const EventNames = {
  // Session events
  SESSION_START: 'session.start',
  SESSION_END: 'session.end',

  // Sync events
  SYNC_PLAY: 'sync.play',
  SYNC_PAUSE: 'sync.pause',
  SYNC_SEEK: 'sync.seek',
  SYNC_RATE_CHANGE: 'sync.rate_change',
  SYNC_CORRECTION_SOFT: 'sync.correction.soft',
  SYNC_CORRECTION_HARD: 'sync.correction.hard',

  // Voice events
  VOICE_JOIN: 'voice.join',
  VOICE_LEAVE: 'voice.leave',
  VOICE_JOIN_SUCCESS: 'voice.join.success',
  VOICE_JOIN_FAILURE: 'voice.join.failure',

  // Chat events
  CHAT_MESSAGE_SENT: 'chat.message.sent',
  CHAT_REACTION_ADDED: 'chat.reaction.added',

  // Funnel events
  FUNNEL_VISIT: 'funnel.visit',
  FUNNEL_CREATE_ROOM: 'funnel.create_room',
  FUNNEL_ADD_VIDEO: 'funnel.add_video',
  FUNNEL_INVITE: 'funnel.invite',
  FUNNEL_PLAY: 'funnel.play',
  FUNNEL_COMPLETE: 'funnel.complete',
} as const;

/**
 * Event payload structure
 */
export interface AnalyticsEventPayload {
  sessionId: string;
  userId?: string;
  roomId?: string;
  eventName: string;
  category: EventCategory;
  properties?: Record<string, any>;
  userAgent?: string;
  platform?: string;
}

/**
 * Batched events stored in Redis
 */
interface BatchedEvent extends AnalyticsEventPayload {
  timestamp: Date;
}

/**
 * Sync correction data
 */
export interface SyncCorrectionData {
  roomId: string;
  userId?: string;
  sessionId: string;
  correctionType: 'soft' | 'hard';
  driftMs: number;
  targetTimeMs: number;
  actualTimeMs: number;
  videoSource?: string;
  playbackRate?: number;
  wasPlaying: boolean;
}

/**
 * Voice join attempt data
 */
export interface VoiceJoinAttemptData {
  roomId: string;
  userId?: string;
  sessionId: string;
  success: boolean;
  failureReason?: string;
  joinTimeMs?: number;
  iceState?: string;
  candidatesCount?: number;
  turnUsed?: boolean;
}

/**
 * Funnel step data
 */
export interface FunnelStepData {
  sessionId: string;
  userId?: string;
  stepName: string;
  stepOrder: number;
  roomId?: string;
  metadata?: Record<string, any>;
}

/**
 * Analytics Service
 */
export class AnalyticsService {
  private readonly BATCH_KEY = 'analytics:batch';
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 30000; // 30 seconds
  private batchTimer?: NodeJS.Timeout;

  constructor() {
    // Start batch processing timer
    this.startBatchTimer();
  }

  /**
   * Track a generic analytics event
   * Events are batched and sent every 30s or when batch size reaches 50
   */
  async trackEvent(payload: AnalyticsEventPayload): Promise<void> {
    const event: BatchedEvent = {
      ...payload,
      timestamp: new Date(),
    };

    // Add to batch in Redis
    await redis.rpush(this.BATCH_KEY, JSON.stringify(event));

    // Check if we should flush immediately
    const batchSize = await redis.llen(this.BATCH_KEY);
    if (batchSize >= this.BATCH_SIZE) {
      await this.flushBatch();
    }
  }

  /**
   * Track sync correction for drift analysis
   */
  async trackSyncCorrection(data: SyncCorrectionData): Promise<void> {
    try {
      await prisma.syncCorrectionLog.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          sessionId: data.sessionId,
          correctionType: data.correctionType,
          driftMs: data.driftMs,
          targetTimeMs: data.targetTimeMs,
          actualTimeMs: data.actualTimeMs,
          videoSource: data.videoSource,
          playbackRate: data.playbackRate || 1.0,
          wasPlaying: data.wasPlaying,
        },
      });

      // Also track as generic event
      await this.trackEvent({
        sessionId: data.sessionId,
        userId: data.userId,
        roomId: data.roomId,
        eventName: data.correctionType === 'soft'
          ? EventNames.SYNC_CORRECTION_SOFT
          : EventNames.SYNC_CORRECTION_HARD,
        category: EventCategory.SYNC,
        properties: {
          driftMs: data.driftMs,
          videoSource: data.videoSource,
          playbackRate: data.playbackRate,
        },
      });
    } catch (error) {
      logger.error({ error, data }, 'Failed to track sync correction');
    }
  }

  /**
   * Track voice join attempt for success rate metrics
   */
  async trackVoiceJoinAttempt(data: VoiceJoinAttemptData): Promise<void> {
    try {
      await prisma.voiceJoinAttempt.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          sessionId: data.sessionId,
          success: data.success,
          failureReason: data.failureReason,
          joinTimeMs: data.joinTimeMs,
          iceState: data.iceState,
          candidatesCount: data.candidatesCount,
          turnUsed: data.turnUsed || false,
        },
      });

      // Also track as generic event
      await this.trackEvent({
        sessionId: data.sessionId,
        userId: data.userId,
        roomId: data.roomId,
        eventName: data.success ? EventNames.VOICE_JOIN_SUCCESS : EventNames.VOICE_JOIN_FAILURE,
        category: EventCategory.VOICE,
        properties: {
          failureReason: data.failureReason,
          joinTimeMs: data.joinTimeMs,
          turnUsed: data.turnUsed,
        },
      });
    } catch (error) {
      logger.error({ error, data }, 'Failed to track voice join attempt');
    }
  }

  /**
   * Track funnel step for drop-off analysis
   */
  async trackFunnelStep(data: FunnelStepData): Promise<void> {
    try {
      await prisma.funnelStep.create({
        data: {
          sessionId: data.sessionId,
          userId: data.userId,
          stepName: data.stepName,
          stepOrder: data.stepOrder,
          roomId: data.roomId,
          metadata: data.metadata as Prisma.InputJsonValue,
        },
      });

      // Also track as generic event
      await this.trackEvent({
        sessionId: data.sessionId,
        userId: data.userId,
        roomId: data.roomId,
        eventName: `funnel.${data.stepName}`,
        category: EventCategory.FUNNEL,
        properties: data.metadata,
      });
    } catch (error) {
      logger.error({ error, data }, 'Failed to track funnel step');
    }
  }

  /**
   * Flush batched events to database
   */
  async flushBatch(): Promise<number> {
    try {
      // Get all batched events atomically
      const pipeline = redis.pipeline();
      pipeline.lrange(this.BATCH_KEY, 0, -1);
      pipeline.del(this.BATCH_KEY);
      const results = await pipeline.exec();

      if (!results || !results[0] || !results[0][1]) {
        return 0;
      }

      const eventStrings = results[0][1] as string[];
      if (eventStrings.length === 0) {
        return 0;
      }

      // Parse events
      const events: BatchedEvent[] = eventStrings
        .map(str => {
          try {
            return JSON.parse(str) as BatchedEvent;
          } catch {
            return null;
          }
        })
        .filter((e): e is BatchedEvent => e !== null);

      if (events.length === 0) {
        return 0;
      }

      // Batch insert to database
      await prisma.analyticsEvent.createMany({
        data: events.map(event => ({
          sessionId: event.sessionId,
          userId: event.userId,
          roomId: event.roomId,
          eventName: event.eventName,
          category: event.category,
          properties: (event.properties || {}) as Prisma.InputJsonValue,
          userAgent: event.userAgent,
          platform: event.platform,
          timestamp: event.timestamp,
        })),
      });

      logger.info({ count: events.length }, 'Flushed analytics batch');
      return events.length;
    } catch (error) {
      logger.error({ error }, 'Failed to flush analytics batch');
      return 0;
    }
  }

  /**
   * Start automatic batch flushing timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(async () => {
      await this.flushBatch();
    }, this.BATCH_INTERVAL_MS);
  }

  /**
   * Stop batch timer (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    // Flush any remaining events
    await this.flushBatch();
  }

  /**
   * Query funnel metrics
   */
  async getFunnelMetrics(startDate?: Date, endDate?: Date) {
    const where: Prisma.FunnelStepWhereInput = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Get counts for each funnel step
    const steps = await prisma.funnelStep.groupBy({
      by: ['stepName', 'stepOrder'],
      where,
      _count: {
        sessionId: true,
      },
      orderBy: {
        stepOrder: 'asc',
      },
    });

    // Calculate drop-off percentages
    const metrics = steps.map((step, index) => {
      const count = step._count.sessionId;
      const previousCount = index > 0 ? steps[index - 1]._count.sessionId : count;
      const dropOffRate = previousCount > 0
        ? ((previousCount - count) / previousCount) * 100
        : 0;

      return {
        stepName: step.stepName,
        stepOrder: step.stepOrder,
        count,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
      };
    });

    return metrics;
  }

  /**
   * Query voice join success rate
   */
  async getVoiceSuccessRate(startDate?: Date, endDate?: Date) {
    const where: Prisma.VoiceJoinAttemptWhereInput = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [totalAttempts, successfulAttempts, avgJoinTime, failureReasons] = await Promise.all([
      // Total attempts
      prisma.voiceJoinAttempt.count({ where }),

      // Successful attempts
      prisma.voiceJoinAttempt.count({
        where: { ...where, success: true }
      }),

      // Average join time for successful attempts
      prisma.voiceJoinAttempt.aggregate({
        where: { ...where, success: true },
        _avg: { joinTimeMs: true },
      }),

      // Failure reasons breakdown
      prisma.voiceJoinAttempt.groupBy({
        by: ['failureReason'],
        where: { ...where, success: false },
        _count: { id: true },
      }),
    ]);

    const successRate = totalAttempts > 0
      ? (successfulAttempts / totalAttempts) * 100
      : 0;

    return {
      totalAttempts,
      successfulAttempts,
      successRate: Math.round(successRate * 100) / 100,
      avgJoinTimeMs: Math.round(avgJoinTime._avg.joinTimeMs || 0),
      failureReasons: failureReasons.map(r => ({
        reason: r.failureReason || 'unknown',
        count: r._count.id,
      })),
    };
  }

  /**
   * Query sync correction frequency and drift metrics
   */
  async getSyncMetrics(startDate?: Date, endDate?: Date) {
    const where: Prisma.SyncCorrectionLogWhereInput = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [totalCorrections, correctionsByType, driftStats, driftByVideoSource] = await Promise.all([
      // Total corrections
      prisma.syncCorrectionLog.count({ where }),

      // Corrections by type
      prisma.syncCorrectionLog.groupBy({
        by: ['correctionType'],
        where,
        _count: { id: true },
      }),

      // Drift statistics
      prisma.$queryRaw<Array<{ p50: number; p95: number; p99: number }>>`
        SELECT
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY "driftMs") as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "driftMs") as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "driftMs") as p99
        FROM "SyncCorrectionLog"
        WHERE ${startDate ? Prisma.sql`"timestamp" >= ${startDate}` : Prisma.sql`true`}
          AND ${endDate ? Prisma.sql`"timestamp" <= ${endDate}` : Prisma.sql`true`}
      `,

      // Corrections by video source
      prisma.syncCorrectionLog.groupBy({
        by: ['videoSource'],
        where,
        _count: { id: true },
        _avg: { driftMs: true },
      }),
    ]);

    const percentiles = driftStats[0] || { p50: 0, p95: 0, p99: 0 };

    return {
      totalCorrections,
      correctionsByType: correctionsByType.map(c => ({
        type: c.correctionType,
        count: c._count.id,
      })),
      driftPercentiles: {
        p50: Math.round(Number(percentiles.p50)),
        p95: Math.round(Number(percentiles.p95)),
        p99: Math.round(Number(percentiles.p99)),
      },
      driftByVideoSource: driftByVideoSource.map(s => ({
        source: s.videoSource || 'unknown',
        count: s._count.id,
        avgDriftMs: Math.round(s._avg.driftMs || 0),
      })),
    };
  }

  /**
   * Get analytics events for a specific session or room
   */
  async getEvents(params: {
    sessionId?: string;
    roomId?: string;
    userId?: string;
    category?: EventCategory;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: Prisma.AnalyticsEventWhereInput = {};

    if (params.sessionId) where.sessionId = params.sessionId;
    if (params.roomId) where.roomId = params.roomId;
    if (params.userId) where.userId = params.userId;
    if (params.category) where.category = params.category;

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = params.startDate;
      if (params.endDate) where.timestamp.lte = params.endDate;
    }

    return prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
    });
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
