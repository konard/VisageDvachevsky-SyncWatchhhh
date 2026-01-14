export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  settings: UserSettings | null;
}

export interface UserSettings {
  voiceMode: 'push_to_talk' | 'voice_activity';
  pttKey: string;
  vadThreshold: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  soundEffectsEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'dark' | 'light' | 'auto';
}

export interface UpdateProfileInput {
  username?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateSettingsInput {
  voiceMode?: 'push_to_talk' | 'voice_activity';
  pttKey?: string;
  vadThreshold?: number;
  noiseSuppression?: boolean;
  echoCancellation?: boolean;
  soundEffectsEnabled?: boolean;
  notificationsEnabled?: boolean;
  theme?: 'dark' | 'light' | 'auto';
}

// Friend-related types
export interface Friend {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  friend: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface FriendRequest {
  id: string;
  status: 'pending';
  createdAt: string;
  requester?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  addressee?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export interface FriendRequestsResponse {
  sent: FriendRequest[];
  received: FriendRequest[];
}

export interface SendFriendRequestInput {
  addresseeId: string;
}

// Watch history types
export interface VideoSource {
  type: 'youtube' | 'file' | 'external';
  youtubeVideoId?: string;
  fileUrl?: string;
  externalUrl?: string;
}

export interface WatchHistoryEntry {
  id: string;
  roomId: string;
  userId: string;
  source: VideoSource;
  watchedAt: string;
  watchDurationMs: number;
  participants: string[];
  thumbnail?: string;
}
