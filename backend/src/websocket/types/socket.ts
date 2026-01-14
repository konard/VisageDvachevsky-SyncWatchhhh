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
  VoiceJoinEvent,
  VoiceLeaveEvent,
  VoiceSignalEvent,
  VoiceSpeakingEvent,
  VoicePeersEvent,
  VoicePeerJoinedEvent,
  VoicePeerLeftEvent,
  VoiceSignalReceivedEvent,
  VoiceSpeakingStatusEvent,
  VoiceErrorEvent,
  TimePingEvent,
  TimePongEvent,
  SyncPlayEvent,
  SyncPauseEvent,
  SyncSeekEvent,
  SyncRateEvent,
  SyncResyncEvent,
  SyncCommandEvent,
  SyncStateEvent,
  PresenceUpdateEvent,
  UserPresenceEvent,
  RichPresenceEvent,
  FriendsPresenceEvent,
  ReactionSendEvent,
  ReactionReceivedEvent,
  TimelineReactionsEvent,
  ReadyInitiateEvent,
  ReadyRespondEvent,
  ReadyStartEvent,
  ReadyUpdateEvent,
  ReadyCompleteEvent,
  ReadyTimeoutEvent,
  CountdownStartEvent,
  CountdownTickEvent,
  CountdownCompleteEvent,
} from './events.js';

// ============================================
// Socket.io Type Definitions
// ============================================

export interface ClientToServerEvents {
  'room:join': (data: RoomJoinEvent) => void;
  'room:leave': (data: RoomLeaveEvent) => void;
  'chat:message': (data: ChatMessageEvent) => void;
  'voice:join': (data: VoiceJoinEvent) => void;
  'voice:leave': (data: VoiceLeaveEvent) => void;
  'voice:signal': (data: VoiceSignalEvent) => void;
  'voice:speaking': (data: VoiceSpeakingEvent) => void;
  'time:ping': (data: TimePingEvent) => void;
  'sync:play': (data: SyncPlayEvent) => void;
  'sync:pause': (data: SyncPauseEvent) => void;
  'sync:seek': (data: SyncSeekEvent) => void;
  'sync:rate': (data: SyncRateEvent) => void;
  'sync:resync': (data: SyncResyncEvent) => void;
  'presence:update': (data: PresenceUpdateEvent) => void;
  'reaction:send': (data: ReactionSendEvent) => void;
  'ready:initiate': (data: ReadyInitiateEvent) => void;
  'ready:respond': (data: ReadyRespondEvent) => void;
}

export interface ServerToClientEvents {
  'room:state': (data: RoomStateEvent) => void;
  'room:participant:joined': (data: RoomParticipantJoinedEvent) => void;
  'room:participant:left': (data: RoomParticipantLeftEvent) => void;
  'room:error': (data: RoomErrorEvent) => void;
  'chat:message': (data: ChatMessage) => void;
  'chat:history': (data: ChatHistoryEvent) => void;
  'chat:error': (data: ChatErrorEvent) => void;
  'voice:peers': (data: VoicePeersEvent) => void;
  'voice:peer:joined': (data: VoicePeerJoinedEvent) => void;
  'voice:peer:left': (data: VoicePeerLeftEvent) => void;
  'voice:signal': (data: VoiceSignalReceivedEvent) => void;
  'voice:speaking': (data: VoiceSpeakingStatusEvent) => void;
  'voice:error': (data: VoiceErrorEvent) => void;
  'time:pong': (data: TimePongEvent) => void;
  'sync:command': (data: SyncCommandEvent) => void;
  'sync:state': (data: SyncStateEvent) => void;
  'presence:update': (data: UserPresenceEvent) => void;
  'presence:rich': (data: RichPresenceEvent) => void;
  'presence:friends': (data: FriendsPresenceEvent) => void;
  'reaction:new': (data: ReactionReceivedEvent) => void;
  'reaction:timeline': (data: TimelineReactionsEvent) => void;
  'ready:start': (data: ReadyStartEvent) => void;
  'ready:update': (data: ReadyUpdateEvent) => void;
  'ready:complete': (data: ReadyCompleteEvent) => void;
  'ready:timeout': (data: ReadyTimeoutEvent) => void;
  'countdown:start': (data: CountdownStartEvent) => void;
  'countdown:tick': (data: CountdownTickEvent) => void;
  'countdown:complete': (data: CountdownCompleteEvent) => void;
  'server:shutdown': (data: { message: string; reconnectIn: number }) => void;
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
  inVoice?: boolean; // Whether user is in voice chat
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
