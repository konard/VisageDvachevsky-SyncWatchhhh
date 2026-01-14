import { Socket as IOSocket, Server as IOServer } from 'socket.io';
import {
  RoomJoinEvent,
  RoomLeaveEvent,
  RoomStateEvent,
  RoomParticipantJoinedEvent,
  RoomParticipantLeftEvent,
  RoomErrorEvent,
  VoiceJoinEvent,
  VoiceLeaveEvent,
  VoiceSignalEvent,
  VoiceSpeakingEvent,
  VoicePeersEvent,
  VoicePeerJoinedEvent,
  VoicePeerLeftEvent,
  VoiceSignalRelayEvent,
  VoiceIceServersEvent,
} from './events.js';

// ============================================
// Socket.io Type Definitions
// ============================================

export interface ClientToServerEvents {
  'room:join': (data: RoomJoinEvent) => void;
  'room:leave': (data: RoomLeaveEvent) => void;
  'voice:join': (data: VoiceJoinEvent) => void;
  'voice:leave': (data: VoiceLeaveEvent) => void;
  'voice:signal': (data: VoiceSignalEvent) => void;
  'voice:speaking': (data: VoiceSpeakingEvent) => void;
}

export interface ServerToClientEvents {
  'room:state': (data: RoomStateEvent) => void;
  'room:participant:joined': (data: RoomParticipantJoinedEvent) => void;
  'room:participant:left': (data: RoomParticipantLeftEvent) => void;
  'room:error': (data: RoomErrorEvent) => void;
  'voice:peers': (data: VoicePeersEvent) => void;
  'voice:peer:joined': (data: VoicePeerJoinedEvent) => void;
  'voice:peer:left': (data: VoicePeerLeftEvent) => void;
  'voice:signal': (data: VoiceSignalRelayEvent) => void;
  'voice:speaking': (data: VoiceSpeakingEvent) => void;
  'voice:ice:servers': (data: VoiceIceServersEvent) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string; // Present for authenticated users
  sessionId: string; // Unique session ID
  roomCode?: string; // Room code if joined
  oderId?: string; // Participant order ID in room
  isGuest: boolean; // Whether this is a guest connection
  guestName?: string; // Guest display name
  isInVoice?: boolean; // Whether user is in voice chat
}

export type Socket = IOSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type Server = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
