import { Socket as IOSocket, Server as IOServer } from 'socket.io';
import {
  RoomJoinEvent,
  RoomLeaveEvent,
  RoomStateEvent,
  RoomParticipantJoinedEvent,
  RoomParticipantLeftEvent,
  RoomErrorEvent,
  ChatMessageEvent,
  ChatMessage,
  ChatHistoryEvent,
  ChatErrorEvent,
  SyncPlayEvent,
  SyncPauseEvent,
  SyncSeekEvent,
  SyncRateEvent,
  SyncCommandEvent,
  SyncStateEvent,
} from './events.js';

// ============================================
// Socket.io Type Definitions
// ============================================

export interface ClientToServerEvents {
  'room:join': (data: RoomJoinEvent) => void;
  'room:leave': (data: RoomLeaveEvent) => void;
  'chat:message': (data: ChatMessageEvent) => void;
  'sync:play': (data: SyncPlayEvent) => void;
  'sync:pause': (data: SyncPauseEvent) => void;
  'sync:seek': (data: SyncSeekEvent) => void;
  'sync:rate': (data: SyncRateEvent) => void;
}

export interface ServerToClientEvents {
  'room:state': (data: RoomStateEvent) => void;
  'room:participant:joined': (data: RoomParticipantJoinedEvent) => void;
  'room:participant:left': (data: RoomParticipantLeftEvent) => void;
  'room:error': (data: RoomErrorEvent) => void;
  'chat:message': (data: ChatMessage) => void;
  'chat:history': (data: ChatHistoryEvent) => void;
  'chat:error': (data: ChatErrorEvent) => void;
  'sync:command': (data: SyncCommandEvent) => void;
  'sync:state': (data: SyncStateEvent) => void;
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
