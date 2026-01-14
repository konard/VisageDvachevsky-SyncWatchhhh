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
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  GUEST_CANNOT_CHAT: 'GUEST_CANNOT_CHAT',
} as const;

// ============================================
// Socket.io Event Names
// ============================================

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
} as const;

export const ServerEvents = {
  ROOM_STATE: 'room:state',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_ERROR: 'room:error',
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',
  CHAT_ERROR: 'chat:error',
} as const;
