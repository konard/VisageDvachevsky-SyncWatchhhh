import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  addresseeId: z.string().min(1, 'Addressee ID is required'),
});

export const friendIdParamSchema = z.object({
  id: z.string().min(1, 'Friend ID is required'),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type FriendIdParam = z.infer<typeof friendIdParamSchema>;
