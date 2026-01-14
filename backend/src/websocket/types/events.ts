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

export type RoomJoinEvent = z.infer<typeof RoomJoinEventSchema>;
export type RoomLeaveEvent = z.infer<typeof RoomLeaveEventSchema>;

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
} as const;

export const ServerEvents = {
  ROOM_STATE: 'room:state',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_ERROR: 'room:error',
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
