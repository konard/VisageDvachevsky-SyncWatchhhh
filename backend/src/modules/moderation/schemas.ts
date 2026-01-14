/**
 * Moderation Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// Report reasons enum
export const reportReasonSchema = z.enum([
  'harassment',
  'inappropriate_content',
  'spam',
  'cheating',
  'hate_speech',
  'other',
]);

// Create report schema
export const createReportSchema = z.object({
  reportedUserId: z.string().cuid(),
  roomId: z.string().cuid(),
  reason: reportReasonSchema,
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

// Update report status schema
export const updateReportStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'actioned', 'dismissed']),
  reviewNotes: z.string().optional(),
});

// Mute user schema
export const muteUserSchema = z.object({
  targetUserId: z.string().cuid(),
  roomId: z.string().cuid(),
  duration: z.enum(['1m', '5m', '15m', '1h']).transform((val) => {
    const durations: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    };
    return durations[val];
  }),
  scope: z.enum(['voice', 'chat', 'both']).default('both'),
  reason: z.string().max(200).optional(),
});

// Shadow mute schema
export const shadowMuteSchema = z.object({
  targetUserId: z.string().cuid(),
  roomId: z.string().cuid(),
});

// Auto-moderation config schema
export const autoModConfigSchema = z.object({
  roomId: z.string().cuid(),
  spamDetection: z.boolean().default(true),
  linkSpamDetection: z.boolean().default(true),
  rateLimitEnabled: z.boolean().default(true),
  maxMessagesPerTenSeconds: z.number().int().min(1).max(50).default(10),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
export type MuteUserInput = z.infer<typeof muteUserSchema>;
export type ShadowMuteInput = z.infer<typeof shadowMuteSchema>;
export type AutoModConfigInput = z.infer<typeof autoModConfigSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
