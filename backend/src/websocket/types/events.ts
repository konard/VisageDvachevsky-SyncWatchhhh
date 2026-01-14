import { z } from 'zod';

// ============================================
// Client Events (Client → Server)
// ============================================

export const RoomJoinEventSchema = z.object({
  roomCode: z.string().length(8),
  password: z.string().optional(),
  guestName: z.string().min(1).max(50).optional(),
});

export const RoomLeaveEventSchema = z.object({});

export const TimePingEventSchema = z.object({
  clientTime: z.number(),
});

export type RoomJoinEvent = z.infer<typeof RoomJoinEventSchema>;
export type RoomLeaveEvent = z.infer<typeof RoomLeaveEventSchema>;
export type TimePingEvent = z.infer<typeof TimePingEventSchema>;

// ============================================
// Server Events (Server → Client)
// ============================================

export interface PlaybackState {
  roomId: string;
  sourceType: 'upload' | 'youtube' | 'external';
  sourceId: string;
  isPlaying: boolean;
  playbackRate: number;
  anchorServerTimeMs: number;
  anchorMediaTimeMs: number;
  sequenceNumber: number;
}

export interface RoomParticipant {
  id: string;
  oderId: string; // Unique order ID for participant in room
  userId?: string;
  username?: string;
  guestName?: string;
  role: 'owner' | 'participant' | 'guest';
  canControl: boolean;
  joinedAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  maxParticipants: number;
  hasPassword: boolean;
  playbackControl: 'owner_only' | 'all' | 'selected';
  createdAt: string;
  expiresAt: string;
}

export interface RoomStateEvent {
  room: Room;
  participants: RoomParticipant[];
  playback: PlaybackState | null;
}

export interface RoomParticipantJoinedEvent {
  participant: RoomParticipant;
}

export interface RoomParticipantLeftEvent {
  oderId: string;
}

export interface RoomErrorEvent {
  code: string;
  message: string;
}

export interface TimePongEvent {
  clientTime: number;
  serverTime: number;
}

// Error codes
export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  GUEST_CANNOT_CHAT: 'GUEST_CANNOT_CHAT',
  FORBIDDEN: 'FORBIDDEN',
} as const;

// ============================================
// Chat Events
// ============================================

export const ChatMessageEventSchema = z.object({
  content: z.string().min(1).max(1000),
});

export type ChatMessageEvent = z.infer<typeof ChatMessageEventSchema>;

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  userId?: string;
  username?: string;
  avatarUrl?: string;
  content?: string;
  event?: SystemEvent;
  timestamp: number;
}

export type SystemEvent =
  | { kind: 'join'; username: string }
  | { kind: 'leave'; username: string }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'seek'; position: number };

export interface ChatHistoryEvent {
  messages: ChatMessage[];
}

export interface ChatErrorEvent {
  code: string;
  message: string;
}

// ============================================
// Socket.io Event Names
// ============================================

export const ClientEvents = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  CHAT_MESSAGE: 'chat:message',
  TIME_PING: 'time:ping',
  SYNC_PLAY: 'sync:play',
  SYNC_PAUSE: 'sync:pause',
  SYNC_SEEK: 'sync:seek',
  SYNC_RATE: 'sync:rate',
  SYNC_RESYNC: 'sync:resync',
  READY_INITIATE: 'ready:initiate',
  READY_RESPOND: 'ready:respond',
} as const;

// ============================================
// Sync Commands (for synchronization protocol)
// ============================================

export type SyncCommand =
  | { type: 'PLAY'; atServerTime: number; sequenceNumber: number }
  | { type: 'PAUSE'; atServerTime: number; sequenceNumber: number }
  | { type: 'SEEK'; targetMediaTime: number; atServerTime: number; sequenceNumber: number }
  | { type: 'SET_RATE'; rate: number; atServerTime: number; sequenceNumber: number }
  | { type: 'STATE_SNAPSHOT'; state: PlaybackState };

// Sync event schemas
export const SyncPlayEventSchema = z.object({
  atServerTime: z.number().optional(),
});

export const SyncPauseEventSchema = z.object({
  atServerTime: z.number().optional(),
});

export const SyncSeekEventSchema = z.object({
  targetMediaTime: z.number().min(0),
  atServerTime: z.number().optional(),
});

export const SyncRateEventSchema = z.object({
  rate: z.number().min(0.1).max(4.0),
  atServerTime: z.number().optional(),
});

export type SyncPlayEvent = z.infer<typeof SyncPlayEventSchema>;
export type SyncPauseEvent = z.infer<typeof SyncPauseEventSchema>;
export type SyncSeekEvent = z.infer<typeof SyncSeekEventSchema>;
export type SyncRateEvent = z.infer<typeof SyncRateEventSchema>;

export interface SyncCommandEvent {
  command: SyncCommand;
}

export interface SyncStateEvent {
  state: PlaybackState;
}

export const ServerEvents = {
  ROOM_STATE: 'room:state',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_ERROR: 'room:error',
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',
  CHAT_ERROR: 'chat:error',
  TIME_PONG: 'time:pong',
  SYNC_COMMAND: 'sync:command',
  SYNC_STATE: 'sync:state',
} as const;

// ============================================
// Voice Chat Events
// ============================================

// RTCSignal represents WebRTC signaling data (SDP or ICE candidate)
export interface RTCSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: string; // Session Description Protocol (for offer/answer)
  candidate?: any; // ICE candidate data (RTCIceCandidateInit from WebRTC)
}

// Client → Server Voice Events
export const VoiceJoinEventSchema = z.object({});
export const VoiceLeaveEventSchema = z.object({});
export const VoiceSignalEventSchema = z.object({
  targetId: z.string(),
  signal: z.object({
    type: z.enum(['offer', 'answer', 'ice-candidate']),
    sdp: z.string().optional(),
    candidate: z.any().optional(), // RTCIceCandidateInit
  }),
});
export const VoiceSpeakingEventSchema = z.object({
  isSpeaking: z.boolean(),
});

export type VoiceJoinEvent = z.infer<typeof VoiceJoinEventSchema>;
export type VoiceLeaveEvent = z.infer<typeof VoiceLeaveEventSchema>;
export type VoiceSignalEvent = z.infer<typeof VoiceSignalEventSchema>;
export type VoiceSpeakingEvent = z.infer<typeof VoiceSpeakingEventSchema>;

// Server → Client Voice Events
export interface VoicePeersEvent {
  peers: string[]; // Array of oderId values
}

export interface VoicePeerJoinedEvent {
  oderId: string;
}

export interface VoicePeerLeftEvent {
  oderId: string;
}

export interface VoiceSignalReceivedEvent {
  fromId: string; // oderId of the sender
  signal: RTCSignal;
}

export interface VoiceSpeakingStatusEvent {
  oderId: string;
  isSpeaking: boolean;
}

// Voice Error Codes
export const VoiceErrorCodes = {
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  NOT_IN_VOICE: 'NOT_IN_VOICE',
  ALREADY_IN_VOICE: 'ALREADY_IN_VOICE',
  PEER_NOT_FOUND: 'PEER_NOT_FOUND',
  INVALID_SIGNAL: 'INVALID_SIGNAL',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export interface VoiceErrorEvent {
  code: string;
  message: string;
}

// ============================================
// Presence Events
// ============================================

export type PresenceStatus = 'online' | 'away' | 'busy' | 'invisible' | 'offline';

export const PresenceUpdateEventSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'invisible', 'offline']),
});

export type PresenceUpdateEvent = z.infer<typeof PresenceUpdateEventSchema>;

export interface UserPresenceEvent {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: number;
  currentRoomId?: string;
  currentActivity?: string;
}

export interface RichPresenceEvent {
  userId: string;
  activity: string;
  details: string;
  timestamp: number;
  partySize?: number;
  partyMax?: number;
  thumbnailUrl?: string;
  joinable: boolean;
  roomCode?: string;
}

export interface FriendsPresenceEvent {
  presences: UserPresenceEvent[];
}

// ============================================
// Reaction Events
// ============================================

export type AnimationType = 'float' | 'burst' | 'bounce';

export const ReactionSendEventSchema = z.object({
  emoji: z.string().min(1).max(10),
  mediaTimeMs: z.number().min(0),
  animation: z.enum(['float', 'burst', 'bounce']).optional(),
});

export type ReactionSendEvent = z.infer<typeof ReactionSendEventSchema>;

export interface ReactionReceivedEvent {
  id: string;
  roomId: string;
  userId?: string;
  username?: string;
  guestName?: string;
  emoji: string;
  position: { x: number; y: number };
  mediaTimeMs: number;
  animation: AnimationType;
  createdAt: number;
}

export interface TimelineReactionsEvent {
  reactions: Array<{
    mediaTimeMs: number;
    reactions: Record<string, number>;
  }>;
}

// ============================================
// Ready Check Events
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

// Client → Server
export const ReadyInitiateEventSchema = z.object({});
export const ReadyRespondEventSchema = z.object({
  checkId: z.string(),
  status: z.enum(['ready', 'not_ready']),
});

export type ReadyInitiateEvent = z.infer<typeof ReadyInitiateEventSchema>;
export type ReadyRespondEvent = z.infer<typeof ReadyRespondEventSchema>;

// Server → Client
export interface ReadyStartEvent {
  check: ReadyCheck;
}

export interface ReadyUpdateEvent {
  check: ReadyCheck;
}

export interface ReadyCompleteEvent {
  checkId: string;
  allReady: boolean;
}

export interface ReadyTimeoutEvent {
  checkId: string;
}

// ============================================
// Countdown Events
// ============================================

export interface CountdownConfig {
  durationMs: number;
  steps: (number | string)[];
  serverStartTime: number;
}

// Server → Client
export interface CountdownStartEvent {
  config: CountdownConfig;
}

export interface CountdownTickEvent {
  step: number | string;
  remaining: number;
}

export interface CountdownCompleteEvent {
  // Empty object
}

// ============================================
// Sync Resync Event
// ============================================

export const SyncResyncEventSchema = z.object({});
export type SyncResyncEvent = z.infer<typeof SyncResyncEventSchema>;
