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
} as const;

// ============================================
// Socket.io Event Names
// ============================================

export const ClientEvents = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  TIME_PING: 'time:ping',
  SYNC_PLAY: 'sync:play',
  SYNC_PAUSE: 'sync:pause',
  SYNC_SEEK: 'sync:seek',
  SYNC_RATE: 'sync:rate',
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
