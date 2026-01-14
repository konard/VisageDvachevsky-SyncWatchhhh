/**
 * Audit Log Cleanup Job
 * Runs periodically to clean up old audit logs based on retention policy
 */

import { auditLogger } from '../common/services/audit-logger.js';
import { logger } from '../config/logger.js';

/**
 * Run audit log cleanup
 * This should be scheduled to run daily (e.g., at 2 AM)
 */
export async function runAuditLogCleanup(): Promise<void> {
  try {
    logger.info('Starting audit log cleanup...');

    const result = await auditLogger.cleanup();

    logger.info(
      {
        security: result.security,
        moderation: result.moderation,
        activity: result.activity,
        total: result.security + result.moderation + result.activity,
      },
      'Audit log cleanup completed successfully'
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Audit log cleanup failed'
    );
    // Don't throw - allow the job to continue on next schedule
  }
}

/**
 * Schedule audit log cleanup
 * Runs daily at 2 AM
 */
export function scheduleAuditLogCleanup(): void {
  // Calculate time until next 2 AM
  const now = new Date();
  const next2AM = new Date();
  next2AM.setHours(2, 0, 0, 0);

  // If it's past 2 AM today, schedule for tomorrow
  if (now > next2AM) {
    next2AM.setDate(next2AM.getDate() + 1);
  }

  const msUntilNext = next2AM.getTime() - now.getTime();

  logger.info(
    {
      nextRun: next2AM.toISOString(),
      msUntilNext,
    },
    'Audit log cleanup scheduled'
  );

  // Schedule first run
  setTimeout(() => {
    runAuditLogCleanup();

    // Then schedule daily runs
    setInterval(() => {
      runAuditLogCleanup();
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntilNext);
}
