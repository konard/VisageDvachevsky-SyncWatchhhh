/**
 * Diagnostics Store
 * Manages debug overlay state and drift history
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DriftPoint {
  timestamp: number;
  driftMs: number;
  correctionType?: 'soft' | 'hard';
  videoSource?: string;
  playbackRate?: number;
}

export interface NetworkMetrics {
  latencyMs: number;
  jitterMs: number;
  packetLoss: number;
}

export interface SyncMetrics {
  serverTimeMs: number;
  localTimeMs: number;
  clockOffsetMs: number;
  driftMs: number;
  bufferHealth: number;
  playbackRate: number;
}

export interface VoiceMetrics {
  connectionState: 'connected' | 'disconnected' | 'connecting';
  audioLevel: number;
  iceState: string;
}

export interface SocketMetrics {
  socketState: 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts: number;
}

export interface DiagnosticsPreferences {
  isOverlayVisible: boolean;
  overlayPosition: { x: number; y: number };
  overlaySize: { width: number; height: number };
  expandedSections: {
    network: boolean;
    sync: boolean;
    voice: boolean;
    socket: boolean;
    timeline: boolean;
  };
}

interface DiagnosticsState {
  // Overlay visibility and preferences
  preferences: DiagnosticsPreferences;

  // Real-time metrics
  networkMetrics: NetworkMetrics | null;
  syncMetrics: SyncMetrics | null;
  voiceMetrics: VoiceMetrics | null;
  socketMetrics: SocketMetrics | null;

  // Drift history for timeline
  driftHistory: DriftPoint[];
  maxHistoryPoints: number;

  // Actions
  toggleOverlay: () => void;
  setOverlayVisible: (visible: boolean) => void;
  setOverlayPosition: (position: { x: number; y: number }) => void;
  setOverlaySize: (size: { width: number; height: number }) => void;
  toggleSection: (section: keyof DiagnosticsPreferences['expandedSections']) => void;

  updateNetworkMetrics: (metrics: NetworkMetrics) => void;
  updateSyncMetrics: (metrics: SyncMetrics) => void;
  updateVoiceMetrics: (metrics: VoiceMetrics) => void;
  updateSocketMetrics: (metrics: SocketMetrics) => void;

  addDriftPoint: (point: DriftPoint) => void;
  clearDriftHistory: () => void;

  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: DiagnosticsPreferences = {
  isOverlayVisible: false,
  overlayPosition: { x: 20, y: 20 },
  overlaySize: { width: 600, height: 800 },
  expandedSections: {
    network: true,
    sync: true,
    voice: true,
    socket: true,
    timeline: true,
  },
};

const MAX_HISTORY_POINTS = 300; // 5 minutes at 1 sample per second

export const useDiagnosticsStore = create<DiagnosticsState>()(
  persist(
    (set) => ({
      // Initial state
      preferences: DEFAULT_PREFERENCES,
      networkMetrics: null,
      syncMetrics: null,
      voiceMetrics: null,
      socketMetrics: null,
      driftHistory: [],
      maxHistoryPoints: MAX_HISTORY_POINTS,

      // Overlay actions
      toggleOverlay: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            isOverlayVisible: !state.preferences.isOverlayVisible,
          },
        })),

      setOverlayVisible: (visible: boolean) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            isOverlayVisible: visible,
          },
        })),

      setOverlayPosition: (position: { x: number; y: number }) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            overlayPosition: position,
          },
        })),

      setOverlaySize: (size: { width: number; height: number }) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            overlaySize: size,
          },
        })),

      toggleSection: (section: keyof DiagnosticsPreferences['expandedSections']) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            expandedSections: {
              ...state.preferences.expandedSections,
              [section]: !state.preferences.expandedSections[section],
            },
          },
        })),

      // Metrics updates
      updateNetworkMetrics: (metrics: NetworkMetrics) =>
        set({ networkMetrics: metrics }),

      updateSyncMetrics: (metrics: SyncMetrics) =>
        set({ syncMetrics: metrics }),

      updateVoiceMetrics: (metrics: VoiceMetrics) =>
        set({ voiceMetrics: metrics }),

      updateSocketMetrics: (metrics: SocketMetrics) =>
        set({ socketMetrics: metrics }),

      // Drift history
      addDriftPoint: (point: DriftPoint) =>
        set((state) => {
          const newHistory = [...state.driftHistory, point];
          // Keep only last N points
          if (newHistory.length > state.maxHistoryPoints) {
            newHistory.shift();
          }
          return { driftHistory: newHistory };
        }),

      clearDriftHistory: () => set({ driftHistory: [] }),

      resetPreferences: () =>
        set({
          preferences: DEFAULT_PREFERENCES,
          driftHistory: [],
        }),
    }),
    {
      name: 'diagnostics-storage',
      // Only persist preferences, not real-time metrics
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
