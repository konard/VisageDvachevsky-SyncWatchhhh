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
// Voice Events (Client → Server)
// ============================================

export const VoiceJoinEventSchema = z.object({});

export const VoiceLeaveEventSchema = z.object({});

export const VoiceSignalEventSchema = z.object({
  targetId: z.string(),
  signal: z.unknown(), // SimplePeer signal data (SDP or ICE candidate)
});

export const VoiceSpeakingEventSchema = z.object({
  isSpeaking: z.boolean(),
});

export type VoiceJoinEvent = z.infer<typeof VoiceJoinEventSchema>;
export type VoiceLeaveEvent = z.infer<typeof VoiceLeaveEventSchema>;
export type VoiceSignalEvent = z.infer<typeof VoiceSignalEventSchema>;
export type VoiceSpeakingEvent = z.infer<typeof VoiceSpeakingEventSchema>;

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

export interface VoicePeersEvent {
  peers: string[]; // Array of oderId for peers in voice chat
}

export interface VoicePeerJoinedEvent {
  oderId: string;
}

export interface VoicePeerLeftEvent {
  oderId: string;
}

export interface VoiceSignalRelayEvent {
  fromId: string; // oderId of sender
  signal: unknown; // SimplePeer signal data
}

export interface VoiceSpeakingEvent {
  oderId: string;
  isSpeaking: boolean;
}

export interface VoiceIceServersEvent {
  iceServers: RTCIceServer[];
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
  NOT_IN_VOICE: 'NOT_IN_VOICE',
  ALREADY_IN_VOICE: 'ALREADY_IN_VOICE',
  VOICE_PEER_NOT_FOUND: 'VOICE_PEER_NOT_FOUND',
} as const;

// ============================================
// Socket.io Event Names
// ============================================

export const ClientEvents = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_SIGNAL: 'voice:signal',
  VOICE_SPEAKING: 'voice:speaking',
} as const;

export const ServerEvents = {
  ROOM_STATE: 'room:state',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_ERROR: 'room:error',
  VOICE_PEERS: 'voice:peers',
  VOICE_PEER_JOINED: 'voice:peer:joined',
  VOICE_PEER_LEFT: 'voice:peer:left',
  VOICE_SIGNAL: 'voice:signal',
  VOICE_SPEAKING: 'voice:speaking',
  VOICE_ICE_SERVERS: 'voice:ice:servers',
} as const;
