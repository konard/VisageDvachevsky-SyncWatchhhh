import { prisma } from '../../common/utils/prisma.js';
import { SearchUsersInput } from './schemas.js';

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

export class UsersService {
  /**
   * Search users by username or email
   */
  async searchUsers(input: SearchUsersInput, currentUserId?: string): Promise<UserSearchResult[]> {
    const { query, limit = 10 } = input;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
        // Exclude current user from results if provided
        ...(currentUserId ? { NOT: { id: currentUserId } } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
      take: limit,
      orderBy: {
        username: 'asc',
      },
    });

    return users;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserSearchResult | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
      },
    });

    return user;
  }
}
