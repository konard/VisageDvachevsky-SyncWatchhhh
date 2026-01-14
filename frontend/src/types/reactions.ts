/**
 * Reactions Types for Frontend
 */

export type AnimationType = 'float' | 'burst' | 'bounce';

export interface VideoReaction {
  id: string;
  roomId: string;
  userId?: string;
  username?: string;
  guestName?: string;
  emoji: string;
  position: { x: number; y: number };
  mediaTimeMs: number;
  animation: AnimationType;
  createdAt: number;
}

export interface TimelineReaction {
  mediaTimeMs: number;
  reactions: Record<string, number>;
}

export const QUICK_REACTIONS = ['👏', '😂', '😱', '❤️', '🔥', '👀'] as const;
