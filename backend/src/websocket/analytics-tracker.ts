/**
 * WebSocket Analytics Tracker
 * Helper to track analytics events from WebSocket handlers
 */

import { analyticsService, EventNames, EventCategory } from '../modules/analytics/service.js';
import type { Socket } from './types/socket.js';

/**
 * Get session ID from socket
 */
function getSessionId(socket: Socket): string {
  // Use socket ID as session ID, or custom session ID if set
  return socket.data.sessionId || socket.id;
}

/**
 * Track sync play event
 */
export async function trackSyncPlay(
  socket: Socket,
  roomId: string
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.SYNC_PLAY,
    category: EventCategory.SYNC,
    properties: {
      oderId: socket.data.oderId,
    },
  });
}

/**
 * Track sync pause event
 */
export async function trackSyncPause(
  socket: Socket,
  roomId: string
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.SYNC_PAUSE,
    category: EventCategory.SYNC,
    properties: {
      oderId: socket.data.oderId,
    },
  });
}

/**
 * Track sync seek event
 */
export async function trackSyncSeek(
  socket: Socket,
  roomId: string,
  targetMediaTime: number
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.SYNC_SEEK,
    category: EventCategory.SYNC,
    properties: {
      oderId: socket.data.oderId,
      targetMediaTime,
    },
  });
}

/**
 * Track sync rate change event
 */
export async function trackSyncRateChange(
  socket: Socket,
  roomId: string,
  rate: number
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.SYNC_RATE_CHANGE,
    category: EventCategory.SYNC,
    properties: {
      oderId: socket.data.oderId,
      rate,
    },
  });
}

/**
 * Track voice join event
 */
export async function trackVoiceJoin(
  socket: Socket,
  roomId: string
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.VOICE_JOIN,
    category: EventCategory.VOICE,
    properties: {
      oderId: socket.data.oderId,
    },
  });
}

/**
 * Track voice leave event
 */
export async function trackVoiceLeave(
  socket: Socket,
  roomId: string
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.VOICE_LEAVE,
    category: EventCategory.VOICE,
    properties: {
      oderId: socket.data.oderId,
    },
  });
}

/**
 * Track chat message sent event
 */
export async function trackChatMessage(
  socket: Socket,
  roomId: string,
  messageLength: number
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.CHAT_MESSAGE_SENT,
    category: EventCategory.CHAT,
    properties: {
      oderId: socket.data.oderId,
      messageLength,
    },
  });
}

/**
 * Track session start event
 */
export async function trackSessionStart(
  socket: Socket,
  roomId?: string
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.SESSION_START,
    category: EventCategory.SESSION,
    properties: {
      oderId: socket.data.oderId,
    },
  });
}

/**
 * Track session end event
 */
export async function trackSessionEnd(
  socket: Socket,
  roomId?: string
): Promise<void> {
  await analyticsService.trackEvent({
    sessionId: getSessionId(socket),
    userId: socket.data.userId,
    roomId,
    eventName: EventNames.SESSION_END,
    category: EventCategory.SESSION,
    properties: {
      oderId: socket.data.oderId,
    },
  });
}
