/**
 * Presence Types for Frontend
 */

export type PresenceStatus = 'online' | 'away' | 'busy' | 'invisible' | 'offline';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: number;
  currentRoomId?: string;
  currentActivity?: string;
}

export interface RichPresence {
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

export interface FriendInRoom {
  friendId: string;
  username: string;
  avatarUrl: string | null;
  roomId: string;
  roomCode: string;
  roomName: string;
  activity: string;
  participantCount: number;
  maxParticipants: number;
  joinable: boolean;
}
