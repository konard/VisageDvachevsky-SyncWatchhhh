import { create } from 'zustand';
import { PlayerControls } from './playback.store';

/**
 * Video source types supported by the application
 */
export type VideoSourceType = 'youtube' | 'upload' | 'external' | null;

/**
 * Video source information
 */
export interface VideoSource {
  type: VideoSourceType;
  // YouTube specific
  youtubeUrl?: string;
  youtubeVideoId?: string;
  // Upload specific
  uploadVideoId?: string;
  uploadStatus?: 'pending' | 'processing' | 'ready' | 'failed';
  uploadProgress?: number;
  manifestUrl?: string; // HLS manifest URL for uploaded videos
  // External URL specific
  externalUrl?: string;
  // Common
  title?: string;
  duration?: number;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  isComplete: boolean;
}

/**
 * Store state for video source management
 */
interface VideoSourceStore {
  // Current video source
  source: VideoSource | null;

  // Upload progress
  uploadProgress: UploadProgress | null;

  // Error message
  error: string | null;

  // Current player controls reference
  currentPlayer: PlayerControls | null;

  // Actions
  setVideoSource: (source: VideoSource | null) => void;
  setUploadProgress: (progress: UploadProgress | null) => void;
  setError: (error: string | null) => void;
  setCurrentPlayer: (player: PlayerControls | null) => void;
  clearVideoSource: () => void;
  reset: () => void;
}

const initialState = {
  source: null,
  uploadProgress: null,
  error: null,
  currentPlayer: null,
};

/**
 * Zustand store for managing video source state
 */
export const useVideoSourceStore = create<VideoSourceStore>((set) => ({
  ...initialState,

  setVideoSource: (source) => set({ source, error: null }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setError: (error) => set({ error }),

  setCurrentPlayer: (player) => set({ currentPlayer: player }),

  clearVideoSource: () =>
    set({
      source: null,
      uploadProgress: null,
      error: null,
    }),

  reset: () => set(initialState),
}));
