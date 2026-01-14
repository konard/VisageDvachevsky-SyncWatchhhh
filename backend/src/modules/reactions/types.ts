/**
 * Reactions Module Types
 */

export type AnimationType = 'float' | 'burst' | 'bounce';

export interface VideoReaction {
  id: string;
  roomId: string;
  userId?: string;
  username?: string;
  guestName?: string;
  emoji: string;
  position: { x: number; y: number }; // Percentage-based (0-100)
  mediaTimeMs: number;
  animation: AnimationType;
  createdAt: number; // Unix timestamp
}

export interface TimelineReaction {
  mediaTimeMs: number;
  reactions: Map<string, number>; // emoji -> count
}

export interface ReactionCreate {
  roomId: string;
  emoji: string;
  mediaTimeMs: number;
  animation?: AnimationType;
}

// Quick reactions preset
export const QUICK_REACTIONS = ['👏', '😂', '😱', '❤️', '🔥', '👀'] as const;

// Rate limiting
export const REACTION_RATE_LIMIT = {
  maxPerMinute: 10,
  maxPerUser: 100, // Max reactions stored per user per room
};
