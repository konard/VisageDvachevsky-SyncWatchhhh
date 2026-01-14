import { z } from 'zod';

export const searchUsersSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  limit: z.number().min(1).max(50).optional().default(10),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
