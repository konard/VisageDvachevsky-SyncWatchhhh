/**
 * Frontend Analytics Service
 * Collects and batches analytics events to send to the backend
 */

import { api as apiClient } from '../lib/api';

export enum EventCategory {
  SESSION = 'session',
  SYNC = 'sync',
  VOICE = 'voice',
  CHAT = 'chat',
  FUNNEL = 'funnel',
}

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

export interface DiagnosticsSnapshot {
  roomId: string;
  userId?: string;
  sessionId: string;
  // Network metrics
  latencyMs?: number;
  jitterMs?: number;
  packetLoss?: number;
  // Sync metrics
  serverTimeMs: number;
  localTimeMs: number;
  clockOffsetMs: number;
  driftMs: number;
  bufferHealth?: number;
  playbackRate: number;
  // Voice metrics
  voiceState?: 'connected' | 'disconnected' | 'connecting';
  audioLevel?: number;
  iceState?: string;
  // Socket metrics
  socketState?: 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts?: number;
}

/**
 * Analytics Service for batching and sending events to backend
 */
class AnalyticsService {
  private eventQueue: AnalyticsEventPayload[] = [];
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 30000; // 30 seconds
  private batchTimer?: NodeJS.Timeout;
  private sessionId: string;

  constructor() {
    // Generate unique session ID
    this.sessionId = this.generateSessionId();

    // Start batch timer
    this.startBatchTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Track a generic analytics event
   */
  async trackEvent(payload: Omit<AnalyticsEventPayload, 'sessionId' | 'userAgent' | 'platform'>): Promise<void> {
    const event: AnalyticsEventPayload = {
      ...payload,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      platform: 'web',
    };

    this.eventQueue.push(event);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
  }

  /**
   * Track sync correction event
   */
  async trackSyncCorrection(data: Omit<SyncCorrectionData, 'sessionId'>): Promise<void> {
    try {
      // Send to dedicated endpoint
      await apiClient.post('/analytics/events', {
        eventName: data.correctionType === 'soft'
          ? EventNames.SYNC_CORRECTION_SOFT
          : EventNames.SYNC_CORRECTION_HARD,
        category: EventCategory.SYNC,
        properties: data,
      });

      // Also track as generic event
      await this.trackEvent({
        roomId: data.roomId,
        userId: data.userId,
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
      console.error('Failed to track sync correction:', error);
    }
  }

  /**
   * Track voice join attempt
   */
  async trackVoiceJoinAttempt(data: Omit<VoiceJoinAttemptData, 'sessionId'>): Promise<void> {
    try {
      await this.trackEvent({
        roomId: data.roomId,
        userId: data.userId,
        eventName: data.success ? EventNames.VOICE_JOIN_SUCCESS : EventNames.VOICE_JOIN_FAILURE,
        category: EventCategory.VOICE,
        properties: {
          failureReason: data.failureReason,
          joinTimeMs: data.joinTimeMs,
          turnUsed: data.turnUsed,
          iceState: data.iceState,
          candidatesCount: data.candidatesCount,
        },
      });
    } catch (error) {
      console.error('Failed to track voice join attempt:', error);
    }
  }

  /**
   * Send diagnostics snapshot to backend
   */
  async sendDiagnosticsSnapshot(snapshot: Omit<DiagnosticsSnapshot, 'sessionId'>): Promise<void> {
    try {
      await apiClient.post('/analytics/diagnostics', {
        ...snapshot,
        sessionId: this.sessionId,
      });
    } catch (error) {
      console.error('Failed to send diagnostics snapshot:', error);
    }
  }

  /**
   * Flush all queued events to the backend
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await apiClient.post('/analytics/events/batch', {
        events: eventsToSend,
      });
    } catch (error) {
      console.error('Failed to flush analytics batch:', error);
      // Re-queue failed events (keep last 100)
      this.eventQueue = [...eventsToSend, ...this.eventQueue].slice(0, 100);
    }
  }

  /**
   * Start automatic batch flushing timer
   */
  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.BATCH_INTERVAL_MS);
  }

  /**
   * Stop batch timer and flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    await this.flush();
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
