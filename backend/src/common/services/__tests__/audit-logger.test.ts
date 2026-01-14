/**
 * Audit Logger Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger, getRetentionDays, AUDIT_RETENTION_DAYS } from '../audit-logger.js';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  describe('getRetentionDays', () => {
    it('should return correct retention days for security events', () => {
      expect(getRetentionDays('auth.login')).toBe(AUDIT_RETENTION_DAYS.security);
      expect(getRetentionDays('auth.login_failed')).toBe(AUDIT_RETENTION_DAYS.security);
      expect(getRetentionDays('auth.password_changed')).toBe(AUDIT_RETENTION_DAYS.security);
      expect(getRetentionDays('security.rate_limit_exceeded')).toBe(AUDIT_RETENTION_DAYS.security);
    });

    it('should return correct retention days for moderation events', () => {
      expect(getRetentionDays('participant.kicked')).toBe(AUDIT_RETENTION_DAYS.moderation);
      expect(getRetentionDays('participant.banned')).toBe(AUDIT_RETENTION_DAYS.moderation);
      expect(getRetentionDays('admin.content_removed')).toBe(AUDIT_RETENTION_DAYS.moderation);
    });

    it('should return correct retention days for activity events', () => {
      expect(getRetentionDays('room.created')).toBe(AUDIT_RETENTION_DAYS.activity);
      expect(getRetentionDays('participant.joined')).toBe(AUDIT_RETENTION_DAYS.activity);
      expect(getRetentionDays('playback.started')).toBe(AUDIT_RETENTION_DAYS.activity);
    });

    it('should default to activity retention for unknown events', () => {
      // @ts-expect-error - testing invalid event type
      expect(getRetentionDays('unknown.event')).toBe(AUDIT_RETENTION_DAYS.activity);
    });
  });

  describe('log', () => {
    it('should log audit events without throwing', async () => {
      // Mock prisma and logger to avoid actual DB writes
      const mockLog = vi.fn();
      vi.spyOn(console, 'info').mockImplementation(mockLog);

      await expect(
        auditLogger.log({
          eventType: 'auth.login',
          actorId: 'user-123',
          actorIp: '192.168.1.1',
          targetType: 'user',
          targetId: 'user-123',
          metadata: { email: 'test@example.com' },
          success: true,
        })
      ).resolves.not.toThrow();
    });
  });
});
