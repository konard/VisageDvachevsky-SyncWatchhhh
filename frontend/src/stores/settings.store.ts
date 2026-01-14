import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User settings interface
 * This is a simplified version that will be expanded when issue #20 is implemented
 */
interface UserSettings {
  // UI settings
  soundEffectsEnabled: boolean;

  // Future settings from issue #20:
  // voiceMode: 'push_to_talk' | 'voice_activity';
  // pttKey: string;
  // vadThreshold: number;
  // noiseSuppression: boolean;
  // echoCancellation: boolean;
  // notificationsEnabled: boolean;
  // theme: 'dark' | 'light' | 'auto';
}

/**
 * Settings store state interface
 */
interface SettingsStore extends UserSettings {
  // Actions
  setSoundEffectsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initialState: UserSettings = {
  soundEffectsEnabled: true,
};

/**
 * Zustand store for managing user settings
 * Uses persist middleware to save settings to localStorage
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSoundEffectsEnabled: (enabled) =>
        set({ soundEffectsEnabled: enabled }),

      reset: () => set(initialState),
    }),
    {
      name: 'syncwatch-settings', // localStorage key
      version: 1,
    }
  )
);
