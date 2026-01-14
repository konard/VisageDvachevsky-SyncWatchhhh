import { z } from 'zod';

// Search users schema
export const searchUsersSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  limit: z.number().min(1).max(50).optional().default(10),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;

// Update profile schema
export const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  email: z.string().email().optional(),
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
}).strict();

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Update settings schema
export const updateSettingsSchema = z.object({
  voiceMode: z.enum(['push_to_talk', 'voice_activity']).optional(),
  pttKey: z.string().optional(),
  vadThreshold: z.number().min(0).max(1).optional(),
  noiseSuppression: z.boolean().optional(),
  echoCancellation: z.boolean().optional(),
  soundEffectsEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  theme: z.enum(['dark', 'light', 'auto']).optional(),
  // Privacy settings
  forceRelay: z.boolean().optional(),
  hideFromSearch: z.boolean().optional(),
  blockNonFriends: z.boolean().optional(),
}).strict();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
