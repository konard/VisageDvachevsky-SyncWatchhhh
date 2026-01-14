/**
 * SyncWatch Shared Types
 * Common types used across frontend and backend
 */

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

// ============================================
// Room Types
// ============================================

export type PlaybackControlMode = 'owner_only' | 'all' | 'selected';

export type RoomRole = 'owner' | 'participant' | 'guest';

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  maxParticipants: number;
  playbackControl: PlaybackControlMode;
  hasPassword: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface RoomParticipant {
  id: string;
  userId?: string;
  username: string;
  avatarUrl?: string;
  role: RoomRole;
  joinedAt: Date;
  isOnline: boolean;
}

export interface CreateRoomRequest {
  name?: string;
  maxParticipants?: 2 | 3 | 4 | 5;
  password?: string;
  playbackControl?: PlaybackControlMode;
}

export interface JoinRoomRequest {
  password?: string;
  guestName?: string;
}

// ============================================
// Video Types
// ============================================

export type VideoSourceType = 'upload' | 'youtube' | 'external';

export type VideoStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Video {
  id: string;
  sourceType: VideoSourceType;
  filename?: string;
  status: VideoStatus;
  progress: number;
  duration?: number;
  manifestUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
}

// ============================================
// Playback Synchronization Types
// ============================================

export interface PlaybackState {
  roomId: string;
  sourceType: VideoSourceType;
  sourceId: string;
  isPlaying: boolean;
  playbackRate: number;
  anchorServerTimeMs: number;
  anchorMediaTimeMs: number;
  sequenceNumber: number;
}

export type SyncCommand =
  | { type: 'PLAY'; atServerTime: number; sequenceNumber: number }
  | { type: 'PAUSE'; atServerTime: number; sequenceNumber: number }
  | { type: 'SEEK'; targetMediaTime: number; atServerTime: number; sequenceNumber: number }
  | { type: 'SET_RATE'; rate: number; atServerTime: number; sequenceNumber: number }
  | { type: 'STATE_SNAPSHOT'; state: PlaybackState };

// ============================================
// Ready Check Types
// ============================================

export type ReadyStatus = 'pending' | 'ready' | 'not_ready' | 'timeout';

export interface ReadyCheckParticipant {
  userId: string;
  username: string;
  status: ReadyStatus;
}

export interface ReadyCheck {
  checkId: string;
  roomId: string;
  initiatedBy: string;
  participants: ReadyCheckParticipant[];
  timeoutMs: number;
  createdAt: number;
}

// ============================================
// Countdown Types
// ============================================

export interface CountdownConfig {
  durationMs: number;
  steps: (number | string)[];
  serverStartTime: number;
}

// ============================================
// Sync Indicator Types
// ============================================

export type SyncIndicatorStatus = 'synced' | 'drifting' | 'desynced';

export interface SyncIndicator {
  status: SyncIndicatorStatus;
  driftMs: number;
  color: 'green' | 'yellow' | 'red';
  showResyncButton: boolean;
}

// ============================================
// Chat Types
// ============================================

export type ChatMessageType = 'user' | 'system';

export type SystemEventKind =
  | 'join'
  | 'leave'
  | 'play'
  | 'pause'
  | 'seek'
  | 'video_change'
  | 'permission_change';

export interface SystemEvent {
  kind: SystemEventKind;
  userId?: string;
  username?: string;
  data?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  content?: string;
  event?: SystemEvent;
  timestamp: number;
}

export interface SendChatMessageRequest {
  content: string;
}

// ============================================
// Voice Chat Types
// ============================================

export type VoiceMode = 'push_to_talk' | 'voice_activity';

export interface VoiceSettings {
  mode: VoiceMode;
  pttKey?: string;
  vadThreshold?: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

export interface VoicePeer {
  userId: string;
  username: string;
  avatarUrl?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  volume: number;
}

export interface RTCSignalMessage {
  fromId: string;
  targetId: string;
  signal: unknown; // RTCSessionDescription | RTCIceCandidate
}

// ============================================
// Friend Types
// ============================================

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  user: PublicUser;
  status: FriendshipStatus;
  createdAt: Date;
}

export interface FriendRequest {
  userId: string;
}

// ============================================
// Authentication Types
// ============================================

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// WebSocket Event Types
// ============================================

// Client to Server Events
export interface ClientToServerEvents {
  // Room events
  'room:join': (data: { roomCode: string; password?: string; guestName?: string }) => void;
  'room:leave': () => void;

  // Sync events
  'sync:play': (data: { atServerTime: number }) => void;
  'sync:pause': (data: { atServerTime: number }) => void;
  'sync:seek': (data: { targetMediaTime: number; atServerTime: number }) => void;
  'sync:rate': (data: { rate: number; atServerTime: number }) => void;
  'sync:report': (data: { currentTime: number; isPlaying: boolean }) => void;
  'sync:resync': () => void;

  // Ready check events
  'ready:initiate': () => void;
  'ready:respond': (data: { checkId: string; status: 'ready' | 'not_ready' }) => void;

  // Chat events
  'chat:message': (data: { content: string }) => void;

  // Voice events
  'voice:join': () => void;
  'voice:leave': () => void;
  'voice:signal': (data: { targetId: string; signal: unknown }) => void;
  'voice:speaking': (data: { isSpeaking: boolean }) => void;

  // Time sync
  'time:ping': (data: { clientTime: number }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Room events
  'room:state': (data: { room: Room; participants: RoomParticipant[]; playback: PlaybackState | null }) => void;
  'room:participant:joined': (data: RoomParticipant) => void;
  'room:participant:left': (data: { userId: string }) => void;
  'room:error': (data: { code: string; message: string }) => void;

  // Sync events
  'sync:command': (data: SyncCommand) => void;
  'sync:state': (data: PlaybackState) => void;

  // Ready check events
  'ready:start': (data: ReadyCheck) => void;
  'ready:update': (data: ReadyCheck) => void;
  'ready:complete': (data: { checkId: string; allReady: boolean }) => void;
  'ready:timeout': (data: { checkId: string }) => void;

  // Countdown events
  'countdown:start': (data: CountdownConfig) => void;
  'countdown:tick': (data: { step: number | string; remaining: number }) => void;
  'countdown:complete': () => void;

  // Chat events
  'chat:message': (data: ChatMessage) => void;
  'chat:history': (data: ChatMessage[]) => void;

  // Voice events
  'voice:peers': (data: string[]) => void;
  'voice:peer:joined': (data: { userId: string }) => void;
  'voice:peer:left': (data: { userId: string }) => void;
  'voice:signal': (data: { fromId: string; signal: unknown }) => void;
  'voice:speaking': (data: { userId: string; isSpeaking: boolean }) => void;

  // Time sync
  'time:pong': (data: { clientTime: number; serverTime: number }) => void;
}

// ============================================
// Constants
// ============================================

export const ROOM_CODE_LENGTH = 8;
export const MAX_PARTICIPANTS = 5;
export const MIN_PARTICIPANTS = 2;
export const MAX_VIDEO_DURATION_SECONDS = 3 * 60 * 60; // 3 hours
export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB
export const SYNC_TOLERANCE_MS = 300;
export const HARD_SYNC_THRESHOLD_MS = 500;
export const SOFT_SYNC_RATE_ADJUST = 0.02;

// Ready check and countdown constants
export const READY_CHECK_TIMEOUT_MS = 30000; // 30 seconds
export const COUNTDOWN_DURATION_MS = 3000; // 3 seconds
export const COUNTDOWN_STEPS = [3, 2, 1, 'GO!'];
export const COUNTDOWN_SYNC_BUFFER_MS = 200; // 200ms buffer for network latency

// Sync indicator thresholds
export const SYNC_THRESHOLDS = {
  synced: 150, // < 150ms = green
  drifting: 500, // 150-500ms = yellow
  desynced: 500, // > 500ms = red + resync button
} as const;

// Soft resync settings
export const SOFT_RESYNC_THRESHOLD_MS = 1000; // Use soft resync for drift < 1 second
export const SOFT_RESYNC_RATE_FAST = 1.03; // 3% faster
export const SOFT_RESYNC_RATE_SLOW = 0.97; // 3% slower

// Rate limits
export const RATE_LIMITS = {
  roomCreation: { max: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  chatMessages: { max: 30, windowMs: 60 * 1000 }, // 30 per minute
  fileUpload: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  apiRequests: { max: 100, windowMs: 60 * 1000 }, // 100 per minute
} as const;

// ============================================
// Room Lifecycle & Smart Ownership Types
// ============================================

// Temporary Host
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

export interface GrantTemporaryHostRequest {
  targetUserId: string;
  permissions: HostPermission[];
  durationMs?: number;
}

// Voting
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

export interface InitiateVoteRequest {
  type: PlaybackVoteType;
}

export interface CastVoteRequest {
  choice: VoteChoice;
}

export interface VoteResults {
  voteId: string;
  type: PlaybackVoteType;
  yesVotes: number;
  noVotes: number;
  threshold: number;
  passed: boolean;
  resolved: boolean;
}

// Participant Metrics
export interface ParticipantMetrics {
  userId: string;
  avgLatencyMs: number;
  packetLossPercent: number;
  connectionUptime: number;
  stabilityScore: number;
}

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';

// Scheduled Rooms
export type ScheduledRoomStatus = 'scheduled' | 'active' | 'cancelled' | 'expired';

export interface ScheduledRoom {
  id: string;
  creatorId: string;
  scheduledFor: Date;
  timezone: string;
  name: string;
  code: string;
  maxParticipants: number;
  hasPassword: boolean;
  playbackControl: PlaybackControlMode;
  status: ScheduledRoomStatus;
  remindersSent: boolean;
  invitedUsers: string[];
  activatedRoomId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledRoomRequest {
  scheduledFor: Date;
  timezone?: string;
  name: string;
  maxParticipants?: number;
  password?: string;
  playbackControl?: PlaybackControlMode;
  videoId?: string;
  youtubeVideoId?: string;
  externalUrl?: string;
  invitedUsers?: string[];
}

// Room History
export interface RoomHistoryEntry {
  id: string;
  roomId: string;
  userId: string;
  roomName: string;
  sourceType: VideoSourceType;
  sourceData: Record<string, any>;
  watchedAt: Date;
  watchDurationMs: number;
  participants: string[];
  thumbnail?: string;
  isVisible: boolean;
}

// Room Templates
export interface RoomSettings {
  maxParticipants: number;
  playbackControl: PlaybackControlMode;
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

export interface CreateRoomTemplateRequest {
  name: string;
  isDefault?: boolean;
  settings: RoomSettings;
}

// WebSocket Events for Room Lifecycle
export interface RoomLifecycleClientEvents {
  'temp-host:grant': (data: GrantTemporaryHostRequest) => void;
  'temp-host:revoke': (data: { userId: string }) => void;
  'vote:initiate': (data: InitiateVoteRequest) => void;
  'vote:cast': (data: { voteId: string; choice: VoteChoice }) => void;
  'metrics:update': (data: Partial<ParticipantMetrics>) => void;
}

export interface RoomLifecycleServerEvents {
  'temp-host:granted': (data: TemporaryHostSession) => void;
  'temp-host:revoked': (data: { userId: string }) => void;
  'vote:started': (data: PlaybackVote) => void;
  'vote:updated': (data: PlaybackVote) => void;
  'vote:resolved': (data: VoteResults) => void;
  'room:idle-warning': (data: { minutesRemaining: number }) => void;
  'room:closing': (data: { reason: string }) => void;
  'scheduled-room:activated': (data: { roomId: string; code: string }) => void;
  'scheduled-room:reminder': (data: { scheduledRoomId: string; minutesUntil: number }) => void;
}
