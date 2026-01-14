import { describe, it, expect, beforeEach } from 'vitest';
import { useVoiceStore } from '../voiceStore';

describe('VoiceStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useVoiceStore.getState().reset();
  });

  it('should have initial state', () => {
    const state = useVoiceStore.getState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.isInVoice).toBe(false);
    expect(state.peers.size).toBe(0);
    expect(state.isMuted).toBe(false);
    expect(state.isSpeaking).toBe(false);
  });

  it('should set connection state', () => {
    useVoiceStore.getState().setConnectionState('connecting');
    expect(useVoiceStore.getState().connectionState).toBe('connecting');
  });

  it('should add and remove peers', () => {
    const { addPeer, removePeer } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');
    expect(useVoiceStore.getState().peers.size).toBe(1);
    expect(useVoiceStore.getState().peers.get('peer1')?.username).toBe('User 1');

    removePeer('peer1');
    expect(useVoiceStore.getState().peers.size).toBe(0);
  });

  it('should set peer speaking status', () => {
    const { addPeer, setPeerSpeaking } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');
    setPeerSpeaking('peer1', true);

    expect(useVoiceStore.getState().peers.get('peer1')?.isSpeaking).toBe(true);
    expect(useVoiceStore.getState().speakingPeers.has('peer1')).toBe(true);

    setPeerSpeaking('peer1', false);
    expect(useVoiceStore.getState().peers.get('peer1')?.isSpeaking).toBe(false);
    expect(useVoiceStore.getState().speakingPeers.has('peer1')).toBe(false);
  });

  it('should set peer volume', () => {
    const { addPeer, setPeerVolume } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');
    setPeerVolume('peer1', 0.5);

    expect(useVoiceStore.getState().peers.get('peer1')?.volume).toBe(0.5);
  });

  it('should update settings', () => {
    const { setSettings } = useVoiceStore.getState();

    setSettings({ mode: 'voice_activity', vadThreshold: 0.5 });

    const settings = useVoiceStore.getState().settings;
    expect(settings.mode).toBe('voice_activity');
    expect(settings.vadThreshold).toBe(0.5);
  });

  it('should reset state', () => {
    const { addPeer, setIsInVoice, reset } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');
    setIsInVoice(true);

    reset();

    const state = useVoiceStore.getState();
    expect(state.isInVoice).toBe(false);
    expect(state.peers.size).toBe(0);
  });
});
