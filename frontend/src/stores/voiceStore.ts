import { create } from 'zustand';
import { VoiceSettings, VoicePeer } from '@syncwatch/shared';

/**
 * Voice connection state
 */
export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected';

/**
 * Voice store state
 */
interface VoiceState {
  // Connection state
  connectionState: VoiceConnectionState;
  isInVoice: boolean;

  // Peers
  peers: Map<string, VoicePeer>;
  speakingPeers: Set<string>;

  // Local state
  isMuted: boolean;
  isSpeaking: boolean;
  localVolume: number;

  // Settings
  settings: VoiceSettings;

  // ICE servers
  iceServers: RTCIceServer[];

  // Errors
  error: string | null;

  // Actions
  setConnectionState: (state: VoiceConnectionState) => void;
  setIsInVoice: (isInVoice: boolean) => void;
  setPeers: (peerIds: string[]) => void;
  addPeer: (peerId: string, username?: string) => void;
  removePeer: (peerId: string) => void;
  updatePeer: (peerId: string, updates: Partial<VoicePeer>) => void;
  setPeerSpeaking: (peerId: string, isSpeaking: boolean) => void;
  setPeerVolume: (peerId: string, volume: number) => void;
  setPeerMuted: (peerId: string, isMuted: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setIsSpeaking: (isSpeaking: boolean) => void;
  setLocalVolume: (volume: number) => void;
  setSettings: (settings: Partial<VoiceSettings>) => void;
  setIceServers: (iceServers: RTCIceServer[]) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Default voice settings
 */
const defaultSettings: VoiceSettings = {
  mode: 'push_to_talk',
  pttKey: 'Space',
  vadThreshold: 0.3,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

/**
 * Voice store
 */
export const useVoiceStore = create<VoiceState>((set) => ({
  // Initial state
  connectionState: 'disconnected',
  isInVoice: false,
  peers: new Map(),
  speakingPeers: new Set(),
  isMuted: false,
  isSpeaking: false,
  localVolume: 1.0,
  settings: defaultSettings,
  iceServers: [],
  error: null,

  // Actions
  setConnectionState: (connectionState) => set({ connectionState }),

  setIsInVoice: (isInVoice) => set({ isInVoice }),

  setPeers: (peerIds) =>
    set((state) => {
      const peers = new Map<string, VoicePeer>();
      for (const peerId of peerIds) {
        const existingPeer = state.peers.get(peerId);
        if (existingPeer) {
          peers.set(peerId, existingPeer);
        } else {
          peers.set(peerId, {
            userId: peerId,
            username: peerId,
            isSpeaking: false,
            isMuted: false,
            volume: 1.0,
          });
        }
      }
      return { peers };
    }),

  addPeer: (peerId, username) =>
    set((state) => {
      const peers = new Map(state.peers);
      if (!peers.has(peerId)) {
        peers.set(peerId, {
          userId: peerId,
          username: username || peerId,
          isSpeaking: false,
          isMuted: false,
          volume: 1.0,
        });
      }
      return { peers };
    }),

  removePeer: (peerId) =>
    set((state) => {
      const peers = new Map(state.peers);
      peers.delete(peerId);

      const speakingPeers = new Set(state.speakingPeers);
      speakingPeers.delete(peerId);

      return { peers, speakingPeers };
    }),

  updatePeer: (peerId, updates) =>
    set((state) => {
      const peers = new Map(state.peers);
      const peer = peers.get(peerId);
      if (peer) {
        peers.set(peerId, { ...peer, ...updates });
      }
      return { peers };
    }),

  setPeerSpeaking: (peerId, isSpeaking) =>
    set((state) => {
      const peers = new Map(state.peers);
      const peer = peers.get(peerId);
      if (peer) {
        peers.set(peerId, { ...peer, isSpeaking });
      }

      const speakingPeers = new Set(state.speakingPeers);
      if (isSpeaking) {
        speakingPeers.add(peerId);
      } else {
        speakingPeers.delete(peerId);
      }

      return { peers, speakingPeers };
    }),

  setPeerVolume: (peerId, volume) =>
    set((state) => {
      const peers = new Map(state.peers);
      const peer = peers.get(peerId);
      if (peer) {
        peers.set(peerId, { ...peer, volume });
      }
      return { peers };
    }),

  setPeerMuted: (peerId, isMuted) =>
    set((state) => {
      const peers = new Map(state.peers);
      const peer = peers.get(peerId);
      if (peer) {
        peers.set(peerId, { ...peer, isMuted });
      }
      return { peers };
    }),

  setIsMuted: (isMuted) => set({ isMuted }),

  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),

  setLocalVolume: (localVolume) => set({ localVolume }),

  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  setIceServers: (iceServers) => set({ iceServers }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      connectionState: 'disconnected',
      isInVoice: false,
      peers: new Map(),
      speakingPeers: new Set(),
      isMuted: false,
      isSpeaking: false,
      error: null,
    }),
}));
