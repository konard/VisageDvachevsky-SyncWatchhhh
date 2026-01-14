import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Friend, FriendRequestsResponse, SendFriendRequestInput } from '../types/user';

interface FriendsResponse {
  friends: Friend[];
}

interface FriendRequestsApiResponse {
  requests: FriendRequestsResponse;
}

interface FriendshipResponse {
  friendship: {
    id: string;
    requesterId: string;
    addresseeId: string;
    status: string;
    createdAt: string;
  };
}

// Get friends list
export const useFriends = () => {
  return useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data } = await api.get<FriendsResponse>('/api/friends');
      return data.friends;
    },
  });
};

// Get friend requests (sent and received)
export const useFriendRequests = () => {
  return useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const { data } = await api.get<FriendRequestsApiResponse>('/api/friends/requests');
      return data.requests;
    },
  });
};

// Send friend request
export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendFriendRequestInput) => {
      const { data } = await api.post<FriendshipResponse>('/api/friends/request', input);
      return data.friendship;
    },
    onSuccess: () => {
      // Invalidate friend requests to refetch
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });
};

// Accept friend request
export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { data } = await api.post<FriendshipResponse>(`/api/friends/accept/${friendshipId}`);
      return data.friendship;
    },
    onSuccess: () => {
      // Invalidate both friends and requests to refetch
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });
};

// Decline friend request
export const useDeclineFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      await api.delete(`/api/friends/decline/${friendshipId}`);
    },
    onSuccess: () => {
      // Invalidate friend requests to refetch
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });
};

// Remove friend
export const useRemoveFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      await api.delete(`/api/friends/${friendshipId}`);
    },
    onSuccess: () => {
      // Invalidate friends list to refetch
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};
