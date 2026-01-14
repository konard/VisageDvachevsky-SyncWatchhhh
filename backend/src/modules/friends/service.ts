import { prisma } from '../../common/utils/prisma.js';
import { SendFriendRequestInput } from './schemas.js';

export interface Friend {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  friendshipId: string;
  friendshipStatus: string;
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: Date;
  requester: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
  addressee: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
  };
}

export class FriendsService {
  /**
   * Get all friends for a user (accepted friendships)
   */
  async getFriends(userId: string): Promise<Friend[]> {
    // Get friendships where the user is either requester or addressee and status is accepted
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { addresseeId: userId, status: 'accepted' },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Map to Friend objects, selecting the other user
    return friendships.map((friendship) => {
      const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;
      return {
        id: friend.id,
        username: friend.username,
        email: friend.email,
        avatarUrl: friend.avatarUrl,
        friendshipId: friendship.id,
        friendshipStatus: friendship.status,
        createdAt: friendship.createdAt,
      };
    });
  }

  /**
   * Get pending friend requests for a user (requests they received)
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests;
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(requesterId: string, input: SendFriendRequestInput): Promise<FriendRequest> {
    const { addresseeId } = input;

    // Check if trying to send to self
    if (requesterId === addresseeId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if addressee exists
    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId },
    });

    if (!addressee) {
      throw new Error('User not found');
    }

    // Check if friendship already exists (in either direction)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'blocked') {
        throw new Error('Cannot send friend request to blocked user');
      }
      if (existingFriendship.status === 'pending') {
        throw new Error('Friend request already pending');
      }
      if (existingFriendship.status === 'accepted') {
        throw new Error('Already friends with this user');
      }
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return friendship;
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(userId: string, friendshipId: string): Promise<FriendRequest> {
    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    // Verify the user is the addressee
    if (friendship.addresseeId !== userId) {
      throw new Error('Not authorized to accept this friend request');
    }

    // Verify status is pending
    if (friendship.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    // Update to accepted
    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updatedFriendship;
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(userId: string, friendshipId: string): Promise<void> {
    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    // Verify the user is the addressee
    if (friendship.addresseeId !== userId) {
      throw new Error('Not authorized to decline this friend request');
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  /**
   * Remove a friend (delete accepted friendship)
   */
  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    // Verify the user is part of the friendship
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new Error('Not authorized to remove this friendship');
    }

    // Verify status is accepted
    if (friendship.status !== 'accepted') {
      throw new Error('Can only remove accepted friendships');
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedUserId: string): Promise<void> {
    // Check if trying to block self
    if (blockerId === blockedUserId) {
      throw new Error('Cannot block yourself');
    }

    // Check if blocked user exists
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
    });

    if (!blockedUser) {
      throw new Error('User not found');
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: blockerId, addresseeId: blockedUserId },
          { requesterId: blockedUserId, addresseeId: blockerId },
        ],
      },
    });

    if (existingFriendship) {
      // Update existing friendship to blocked
      await prisma.friendship.update({
        where: { id: existingFriendship.id },
        data: {
          status: 'blocked',
          // Ensure blocker is the requester
          requesterId: blockerId,
          addresseeId: blockedUserId,
        },
      });
    } else {
      // Create new blocked friendship
      await prisma.friendship.create({
        data: {
          requesterId: blockerId,
          addresseeId: blockedUserId,
          status: 'blocked',
        },
      });
    }
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId1, addresseeId: userId2, status: 'accepted' },
          { requesterId: userId2, addresseeId: userId1, status: 'accepted' },
        ],
      },
    });

    return !!friendship;
  }
}
