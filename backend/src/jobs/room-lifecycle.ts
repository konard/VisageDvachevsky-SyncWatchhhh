/**
 * Room Lifecycle Background Jobs
 * Handles scheduled room activation, idle room cleanup, and expired session cleanup
 */

import { logger } from '../config/logger.js';
import {
  IdleRoomService,
  ScheduledRoomService,
  TemporaryHostService,
  VotingService,
} from '../modules/room-lifecycle/index.js';

const idleRoomService = new IdleRoomService();
const scheduledRoomService = new ScheduledRoomService();
const tempHostService = new TemporaryHostService();
const votingService = new VotingService();

let idleCheckInterval: NodeJS.Timeout | null = null;
let scheduledRoomInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Check for idle rooms and close them
 */
async function checkIdleRooms() {
  try {
    const [warned, closed] = await idleRoomService.checkIdleRooms();
    if (warned > 0 || closed > 0) {
      logger.info(
        { warned, closed },
        'Idle room check completed'
      );
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error checking idle rooms');
  }
}

/**
 * Check for scheduled rooms that need activation
 */
async function checkScheduledRooms() {
  try {
    // Check for rooms needing reminders
    const roomsNeedingReminders = await scheduledRoomService.getRoomsNeedingReminders();
    for (const room of roomsNeedingReminders) {
      logger.info(
        { roomId: room.id, scheduledFor: room.scheduledFor },
        'Sending room reminders'
      );
      // TODO: Send reminders via email/notification
      await scheduledRoomService.markRemindersSent(room.id);
    }

    // Check for rooms needing activation
    const roomsNeedingActivation = await scheduledRoomService.getRoomsNeedingActivation();
    for (const room of roomsNeedingActivation) {
      logger.info(
        { roomId: room.id, scheduledFor: room.scheduledFor },
        'Activating scheduled room'
      );
      try {
        await scheduledRoomService.activateScheduledRoom(room.id);
        // TODO: Send notifications to invited users
      } catch (error) {
        logger.error(
          { error: (error as Error).message, roomId: room.id },
          'Error activating scheduled room'
        );
      }
    }

    // Expire old scheduled rooms
    const expiredCount = await scheduledRoomService.expireOldScheduledRooms();
    if (expiredCount > 0) {
      logger.info({ expiredCount }, 'Expired old scheduled rooms');
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error checking scheduled rooms');
  }
}

/**
 * Clean up expired sessions and votes
 */
async function cleanupExpiredSessions() {
  try {
    // Cleanup expired temporary host sessions
    const expiredHosts = await tempHostService.cleanupExpiredSessions();
    if (expiredHosts > 0) {
      logger.info({ count: expiredHosts }, 'Cleaned up expired temporary host sessions');
    }

    // Cleanup expired votes
    const expiredVotes = await votingService.cleanupExpiredVotes();
    if (expiredVotes > 0) {
      logger.info({ count: expiredVotes }, 'Cleaned up expired votes');
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error cleaning up expired sessions');
  }
}

/**
 * Start all room lifecycle background jobs
 */
export function startRoomLifecycleJobs() {
  // Check idle rooms every minute
  idleCheckInterval = setInterval(checkIdleRooms, 60 * 1000);
  logger.info('Started idle room check job (every 1 minute)');

  // Check scheduled rooms every minute
  scheduledRoomInterval = setInterval(checkScheduledRooms, 60 * 1000);
  logger.info('Started scheduled room check job (every 1 minute)');

  // Cleanup expired sessions every 5 minutes
  cleanupInterval = setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
  logger.info('Started cleanup job (every 5 minutes)');

  // Run checks immediately on startup
  checkIdleRooms();
  checkScheduledRooms();
  cleanupExpiredSessions();
}

/**
 * Stop all room lifecycle background jobs
 */
export function stopRoomLifecycleJobs() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
    logger.info('Stopped idle room check job');
  }

  if (scheduledRoomInterval) {
    clearInterval(scheduledRoomInterval);
    scheduledRoomInterval = null;
    logger.info('Stopped scheduled room check job');
  }

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Stopped cleanup job');
  }
}
