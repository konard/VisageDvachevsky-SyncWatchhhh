/**
 * Validation Schemas for Room Lifecycle & Smart Ownership
 */

import { z } from 'zod';

// ============================================
// Temporary Host Schemas
// ============================================

export const hostPermissionSchema = z.enum([
  'playback_control',
  'source_change',
  'kick_users',
  'manage_permissions',
]);

export const grantTemporaryHostSchema = z.object({
  targetUserId: z.string().cuid(),
  permissions: z.array(hostPermissionSchema).min(1),
  durationMs: z.number().int().positive().optional(),
});

export type GrantTemporaryHostInput = z.infer<typeof grantTemporaryHostSchema>;

// ============================================
// Voting Schemas
// ============================================

export const initiateVoteSchema = z.object({
  type: z.enum(['pause', 'resume']),
});

export type InitiateVoteInput = z.infer<typeof initiateVoteSchema>;

export const castVoteSchema = z.object({
  choice: z.enum(['yes', 'no']),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

// ============================================
// Scheduled Room Schemas
// ============================================

export const createScheduledRoomSchema = z.object({
  scheduledFor: z.string().datetime().transform((val) => new Date(val)),
  timezone: z.string().default('UTC'),
  name: z.string().min(1).max(100),
  maxParticipants: z.number().int().min(2).max(5).default(5),
  password: z.string().min(4).max(50).optional(),
  playbackControl: z.enum(['owner_only', 'all', 'selected']).default('owner_only'),
  videoId: z.string().cuid().optional(),
  youtubeVideoId: z.string().optional(),
  externalUrl: z.string().url().optional(),
  invitedUsers: z.array(z.string().cuid()).optional(),
});

export type CreateScheduledRoomInput = z.infer<typeof createScheduledRoomSchema>;

// ============================================
// Room Template Schemas
// ============================================

export const roomSettingsSchema = z.object({
  maxParticipants: z.number().int().min(2).max(5).default(5),
  playbackControl: z.enum(['owner_only', 'all', 'selected']).default('owner_only'),
  voiceEnabled: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  readyCheckEnabled: z.boolean().optional(),
  countdownEnabled: z.boolean().optional(),
  autoHandover: z.boolean().optional(),
  privacyPreset: z.enum(['public', 'friends_only', 'private']).optional(),
  ownerLock: z.boolean().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
  settings: roomSettingsSchema,
});

export type CreateRoomTemplateInput = z.infer<typeof createTemplateSchema>;

// ============================================
// Metrics Schemas
// ============================================

export const updateMetricsSchema = z.object({
  avgLatencyMs: z.number().min(0).optional(),
  packetLossPercent: z.number().min(0).max(100).optional(),
  connectionUptime: z.number().int().min(0).optional(),
});

export type UpdateMetricsInput = z.infer<typeof updateMetricsSchema>;
