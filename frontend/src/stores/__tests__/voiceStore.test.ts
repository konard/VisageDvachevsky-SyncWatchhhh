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

  it('should set peer volume in 0-200% range', () => {
    const { addPeer, setPeerVolume } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');

    // Test minimum
    setPeerVolume('peer1', 0);
    expect(useVoiceStore.getState().peers.get('peer1')?.volume).toBe(0);

    // Test normal
    setPeerVolume('peer1', 1.0);
    expect(useVoiceStore.getState().peers.get('peer1')?.volume).toBe(1.0);

    // Test maximum (200%)
    setPeerVolume('peer1', 2.0);
    expect(useVoiceStore.getState().peers.get('peer1')?.volume).toBe(2.0);
  });

  it('should set peer muted', () => {
    const { addPeer, setPeerMuted } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');
    setPeerMuted('peer1', true);

    expect(useVoiceStore.getState().peers.get('peer1')?.isMuted).toBe(true);

    setPeerMuted('peer1', false);
    expect(useVoiceStore.getState().peers.get('peer1')?.isMuted).toBe(false);
  });

  it('should update peer with quality metrics', () => {
    const { addPeer, updatePeer } = useVoiceStore.getState();

    addPeer('peer1', 'User 1');
    updatePeer('peer1', {
      quality: 'good',
      bitrate: 64,
      packetLoss: 1.5,
      jitter: 15,
      latency: 80,
      audioLevel: 0.5,
    });

    const peer = useVoiceStore.getState().peers.get('peer1');
    expect(peer?.quality).toBe('good');
    expect(peer?.bitrate).toBe(64);
    expect(peer?.packetLoss).toBe(1.5);
    expect(peer?.jitter).toBe(15);
    expect(peer?.latency).toBe(80);
    expect(peer?.audioLevel).toBe(0.5);
  });

  it('should update settings', () => {
    const { setSettings } = useVoiceStore.getState();

    setSettings({ mode: 'voice_activity', vadThreshold: 0.5 });

    const settings = useVoiceStore.getState().settings;
    expect(settings.mode).toBe('voice_activity');
    expect(settings.vadThreshold).toBe(0.5);
  });

  it('should support PTT mouse button setting', () => {
    const { setSettings } = useVoiceStore.getState();

    setSettings({ pttMouseButton: 3 });

    const settings = useVoiceStore.getState().settings;
    expect(settings.pttMouseButton).toBe(3);
  });

  it('should support noise suppression level setting', () => {
    const { setSettings } = useVoiceStore.getState();

    setSettings({ noiseSuppressionLevel: 'high' });

    const settings = useVoiceStore.getState().settings;
    expect(settings.noiseSuppressionLevel).toBe('high');
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
