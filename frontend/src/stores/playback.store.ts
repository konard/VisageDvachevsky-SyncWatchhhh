import { create } from 'zustand';
import { PlaybackState, SyncCommand } from '@syncwatch/shared';

/**
 * Sync status indicating the current synchronization state
 */
export type SyncStatus = 'synced' | 'syncing' | 'drifted' | 'error';

/**
 * Player controls interface that must be implemented by all players
 * (YouTube, HLS, etc.)
 */
export interface PlayerControls {
  play(): Promise<void> | void;
  pause(): void;
  seek(timeSeconds: number): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
}

/**
 * Store state for playback synchronization
 */
interface PlaybackStore {
  // Current playback state from server
  playbackState: PlaybackState | null;

  // Sync status
  syncStatus: SyncStatus;

  // Current drift in milliseconds (positive = ahead, negative = behind)
  drift: number;

  // Last sync check timestamp
  lastSyncCheck: number;

  // Buffered commands waiting to be executed
  commandBuffer: Array<{ command: SyncCommand; scheduledTime: number }>;

  // Reference to player controls
  playerControls: PlayerControls | null;

  // Clock offset from server (calculated by clock sync)
  clockOffset: number;

  // Actions
  setPlaybackState: (state: PlaybackState) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setDrift: (drift: number) => void;
  setPlayerControls: (controls: PlayerControls | null) => void;
  setClockOffset: (offset: number) => void;
  addCommandToBuffer: (command: SyncCommand, scheduledTime: number) => void;
  removeCommandFromBuffer: (index: number) => void;
  clearCommandBuffer: () => void;
  reset: () => void;
}

const initialState = {
  playbackState: null,
  syncStatus: 'syncing' as SyncStatus,
  drift: 0,
  lastSyncCheck: 0,
  commandBuffer: [],
  playerControls: null,
  clockOffset: 0,
};

/**
 * Zustand store for managing playback synchronization state
 */
export const usePlaybackStore = create<PlaybackStore>((set) => ({
  ...initialState,

  setPlaybackState: (state) => set({ playbackState: state }),

  setSyncStatus: (status) => set({ syncStatus: status }),

  setDrift: (drift) => set({ drift, lastSyncCheck: Date.now() }),

  setPlayerControls: (controls) => set({ playerControls: controls }),

  setClockOffset: (offset) => set({ clockOffset: offset }),

  addCommandToBuffer: (command, scheduledTime) =>
    set((state) => ({
      commandBuffer: [...state.commandBuffer, { command, scheduledTime }],
    })),

  removeCommandFromBuffer: (index) =>
    set((state) => ({
      commandBuffer: state.commandBuffer.filter((_, i) => i !== index),
    })),

  clearCommandBuffer: () => set({ commandBuffer: [] }),

  reset: () => set(initialState),
}));
