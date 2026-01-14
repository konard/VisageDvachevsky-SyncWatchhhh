/**
 * Types for Room Lifecycle & Smart Ownership Features
 */

// ============================================
// Smart Ownership Types
// ============================================

export type HostPermission =
  | 'playback_control'
  | 'source_change'
  | 'kick_users'
  | 'manage_permissions';

export interface TemporaryHostSession {
  id: string;
  roomId: string;
  permanentOwnerId: string;
  temporaryHostId: string;
  grantedAt: Date;
  expiresAt: Date | null;
  permissions: HostPermission[];
  revoked: boolean;
}

export interface GrantTemporaryHostInput {
  roomId: string;
  targetUserId: string;
  permissions: HostPermission[];
  durationMs?: number; // Optional duration in milliseconds
}

export type PlaybackVoteType = 'pause' | 'resume';
export type VoteChoice = 'yes' | 'no';

export interface PlaybackVote {
  id: string;
  roomId: string;
  type: PlaybackVoteType;
  initiatedBy: string;
  initiatedAt: Date;
  expiresAt: Date;
  threshold: number;
  votes: Record<string, VoteChoice>;
  resolved: boolean;
  passed: boolean;
}

export interface ParticipantMetrics {
  userId: string;
  avgLatencyMs: number;
  packetLossPercent: number;
  connectionUptime: number;
  stabilityScore: number;
}

// ============================================
// Room Lifecycle Types
// ============================================

export type ScheduledRoomStatus = 'scheduled' | 'active' | 'cancelled' | 'expired';

export interface ScheduledRoom {
  id: string;
  creatorId: string;
  scheduledFor: Date;
  timezone: string;
  name: string;
  code: string;
  maxParticipants: number;
  passwordHash?: string;
  playbackControl: string;
  videoId?: string;
  youtubeVideoId?: string;
  externalUrl?: string;
  status: ScheduledRoomStatus;
  remindersSent: boolean;
  invitedUsers: string[];
  activatedRoomId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledRoomInput {
  scheduledFor: Date;
  timezone: string;
  name: string;
  maxParticipants?: number;
  password?: string;
  playbackControl?: string;
  videoId?: string;
  youtubeVideoId?: string;
  externalUrl?: string;
  invitedUsers?: string[];
}

export type SourceType = 'upload' | 'youtube' | 'external';

export interface RoomHistoryEntry {
  id: string;
  roomId: string;
  userId: string;
  roomName: string;
  sourceType: SourceType;
  sourceData: Record<string, any>;
  watchedAt: Date;
  watchDurationMs: number;
  participants: string[];
  thumbnail?: string;
  isVisible: boolean;
}

export interface RoomSettings {
  maxParticipants: number;
  playbackControl: 'owner_only' | 'all' | 'selected';
  voiceEnabled?: boolean;
  chatEnabled?: boolean;
  readyCheckEnabled?: boolean;
  countdownEnabled?: boolean;
  autoHandover?: boolean;
  privacyPreset?: 'public' | 'friends_only' | 'private';
  ownerLock?: boolean;
}

export interface RoomTemplate {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomTemplateInput {
  name: string;
  isDefault?: boolean;
  settings: RoomSettings;
}

// ============================================
// Idle Room Policy
// ============================================

export interface RoomIdlePolicy {
  maxIdleTimeMs: number;
  warningBeforeMs: number;
  checkIntervalMs: number;
}

export const DEFAULT_IDLE_POLICY: RoomIdlePolicy = {
  maxIdleTimeMs: 30 * 60 * 1000, // 30 minutes
  warningBeforeMs: 5 * 60 * 1000, // 5 minutes before closure
  checkIntervalMs: 60 * 1000, // Check every minute
};
