import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { User, UpdateProfileInput, ChangePasswordInput, UpdateSettingsInput } from '../types/user';

interface ProfileResponse {
  user: User;
}

interface SettingsResponse {
  settings: User['settings'];
}

// Get user profile
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>('/api/users/me');
      return data.user;
    },
  });
};

// Update profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await api.patch<ProfileResponse>('/api/users/me', input);
      return data.user;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
    },
  });
};

// Update avatar
export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (avatarUrl: string) => {
      const { data } = await api.post<ProfileResponse>('/api/users/me/avatar', { avatarUrl });
      return data.user;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
    },
  });
};

// Change password
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      await api.post('/api/users/me/password', input);
    },
  });
};

// Delete account
export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: async () => {
      await api.delete('/api/users/me');
    },
    onSuccess: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    },
  });
};

// Get settings
export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<SettingsResponse>('/api/users/me/settings');
      return data.settings;
    },
  });
};

// Update settings
export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      const { data } = await api.patch<SettingsResponse>('/api/users/me/settings', input);
      return data.settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
    },
  });
};
