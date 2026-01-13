/**
 * Room Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';
import { MIN_PARTICIPANTS, MAX_PARTICIPANTS } from '@syncwatch/shared';

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, 'Room name is required')
    .max(50, 'Room name must be at most 50 characters')
    .optional()
    .transform((val) => val || 'Watch Room'),
  maxParticipants: z
    .number()
    .int()
    .min(MIN_PARTICIPANTS)
    .max(MAX_PARTICIPANTS)
    .optional()
    .default(MAX_PARTICIPANTS),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(50, 'Password must be at most 50 characters')
    .optional(),
  playbackControl: z
    .enum(['owner_only', 'all', 'selected'])
    .optional()
    .default('owner_only'),
});

export const joinRoomSchema = z.object({
  password: z.string().optional(),
  guestName: z
    .string()
    .min(1, 'Guest name is required')
    .max(30, 'Guest name must be at most 30 characters')
    .optional(),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(1, 'Room name is required')
    .max(50, 'Room name must be at most 50 characters')
    .optional(),
  maxParticipants: z
    .number()
    .int()
    .min(MIN_PARTICIPANTS)
    .max(MAX_PARTICIPANTS)
    .optional(),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(50, 'Password must be at most 50 characters')
    .nullable()
    .optional(),
  playbackControl: z.enum(['owner_only', 'all', 'selected']).optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
