/**
 * Presence Module Types
 * Defines types for user presence and rich presence features
 */

export type PresenceStatus = 'online' | 'away' | 'busy' | 'invisible' | 'offline';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: number; // Unix timestamp
  currentRoomId?: string;
  currentActivity?: string;
}

export interface RichPresence {
  userId: string;
  activity: string; // "Watching"
  details: string; // "Breaking Bad S1E1" or video title
  timestamp: number; // Unix timestamp - started at
  partySize?: number; // Number of current participants
  partyMax?: number; // Maximum participants (e.g., 5)
  thumbnailUrl?: string;
  joinable: boolean;
  roomCode?: string; // For friends to join
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

export interface PresenceUpdate {
  userId: string;
  status?: PresenceStatus;
  currentRoomId?: string;
  currentActivity?: string;
}
