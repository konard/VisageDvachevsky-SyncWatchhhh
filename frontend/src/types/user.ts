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
