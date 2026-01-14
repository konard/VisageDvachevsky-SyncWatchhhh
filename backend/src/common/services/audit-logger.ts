/**
 * Audit Logger Service
 * Logs security-relevant events for incident investigation and compliance
 */

import { prisma } from '../utils/prisma.js';
import { logger } from '../../config/logger.js';

/**
 * Audit event types
 */
export type AuditEventType =
  // Room events
  | 'room.created'
  | 'room.deleted'
  | 'room.settings_changed'
  // Participant events
  | 'participant.joined'
  | 'participant.left'
  | 'participant.kicked'
  | 'participant.banned'
  // Permission events
  | 'permission.granted'
  | 'permission.revoked'
  | 'ownership.transferred'
  // Playback events
  | 'playback.started'
  | 'playback.paused'
  | 'playback.video_changed'
  // Auth events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.password_changed'
  | 'auth.register'
  // Admin events
  | 'admin.user_banned'
  | 'admin.content_removed'
  // Security events
  | 'security.rate_limit_exceeded'
  | 'security.brute_force_detected'
  | 'security.upload_rejected';

/**
 * Target types for audit events
 */
export type AuditTargetType = 'room' | 'user' | 'video' | 'system';

/**
 * Audit event interface
 */
export interface AuditEvent {
  eventType: AuditEventType;
  actorId?: string; // User who performed the action
  actorIp: string; // IP address of the actor
  targetType: AuditTargetType;
  targetId: string;
  metadata: Record<string, unknown>;
  success: boolean;
}

/**
 * Audit retention policy (in days)
 */
export const AUDIT_RETENTION_DAYS = {
  security: 365, // Auth events, bans - 1 year
  moderation: 90, // Kicks, content removal - 90 days
  activity: 30, // Joins, leaves, playback - 30 days
} as const;

/**
 * Event type to retention category mapping
 */
const EVENT_RETENTION_CATEGORY: Record<string, keyof typeof AUDIT_RETENTION_DAYS> = {
  'auth.login': 'security',
  'auth.logout': 'security',
  'auth.login_failed': 'security',
  'auth.password_changed': 'security',
  'auth.register': 'security',
  'admin.user_banned': 'security',
  'security.rate_limit_exceeded': 'security',
  'security.brute_force_detected': 'security',
  'security.upload_rejected': 'security',
  'participant.kicked': 'moderation',
  'participant.banned': 'moderation',
  'admin.content_removed': 'moderation',
  'room.created': 'activity',
  'room.deleted': 'activity',
  'room.settings_changed': 'activity',
  'participant.joined': 'activity',
  'participant.left': 'activity',
  'permission.granted': 'activity',
  'permission.revoked': 'activity',
  'ownership.transferred': 'activity',
  'playback.started': 'activity',
  'playback.paused': 'activity',
  'playback.video_changed': 'activity',
};

/**
 * Get retention period for an event type
 */
export function getRetentionDays(eventType: AuditEventType): number {
  const category = EVENT_RETENTION_CATEGORY[eventType] || 'activity';
  return AUDIT_RETENTION_DAYS[category];
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      // 1. Write to database for queryability
      await prisma.auditLog.create({
        data: {
          eventType: event.eventType,
          actorId: event.actorId,
          actorIp: event.actorIp,
          targetType: event.targetType,
          targetId: event.targetId,
          metadata: event.metadata as any,
          success: event.success,
        },
      });

      // 2. Also emit structured log for log aggregation systems
      logger.info(
        {
          audit: true,
          eventType: event.eventType,
          actorId: event.actorId,
          actorIp: event.actorIp,
          targetType: event.targetType,
          targetId: event.targetId,
          success: event.success,
          metadata: event.metadata,
        },
        `Audit: ${event.eventType}`
      );
    } catch (error) {
      // Log errors but don't throw - audit logging should not break app functionality
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          event,
        },
        'Failed to write audit log'
      );
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: {
    eventType?: AuditEventType;
    actorId?: string;
    targetType?: AuditTargetType;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters.targetId) {
      where.targetId = filters.targetId;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanup(): Promise<{
    security: number;
    moderation: number;
    activity: number;
  }> {
    const now = new Date();

    // Calculate cutoff dates for each category
    const cutoffs = {
      security: new Date(now.getTime() - AUDIT_RETENTION_DAYS.security * 24 * 60 * 60 * 1000),
      moderation: new Date(now.getTime() - AUDIT_RETENTION_DAYS.moderation * 24 * 60 * 60 * 1000),
      activity: new Date(now.getTime() - AUDIT_RETENTION_DAYS.activity * 24 * 60 * 60 * 1000),
    };

    // Get event types for each category
    const securityEvents = Object.keys(EVENT_RETENTION_CATEGORY).filter(
      (key) => EVENT_RETENTION_CATEGORY[key] === 'security'
    );
    const moderationEvents = Object.keys(EVENT_RETENTION_CATEGORY).filter(
      (key) => EVENT_RETENTION_CATEGORY[key] === 'moderation'
    );
    const activityEvents = Object.keys(EVENT_RETENTION_CATEGORY).filter(
      (key) => EVENT_RETENTION_CATEGORY[key] === 'activity'
    );

    // Delete old logs for each category
    const [securityDeleted, moderationDeleted, activityDeleted] = await Promise.all([
      prisma.auditLog.deleteMany({
        where: {
          eventType: { in: securityEvents },
          timestamp: { lt: cutoffs.security },
        },
      }),
      prisma.auditLog.deleteMany({
        where: {
          eventType: { in: moderationEvents },
          timestamp: { lt: cutoffs.moderation },
        },
      }),
      prisma.auditLog.deleteMany({
        where: {
          eventType: { in: activityEvents },
          timestamp: { lt: cutoffs.activity },
        },
      }),
    ]);

    logger.info(
      {
        security: securityDeleted.count,
        moderation: moderationDeleted.count,
        activity: activityDeleted.count,
      },
      'Audit log cleanup completed'
    );

    return {
      security: securityDeleted.count,
      moderation: moderationDeleted.count,
      activity: activityDeleted.count,
    };
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
