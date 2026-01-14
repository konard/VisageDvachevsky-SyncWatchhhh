import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { WatchHistoryEntry } from '../types/user';

interface WatchHistoryResponse {
  history: WatchHistoryEntry[];
}

// Get watch history
export const useWatchHistory = (limit: number = 20) => {
  return useQuery({
    queryKey: ['watchHistory', limit],
    queryFn: async () => {
      const { data } = await api.get<WatchHistoryResponse>(`/api/users/me/history?limit=${limit}`);
      return data.history;
    },
  });
};
