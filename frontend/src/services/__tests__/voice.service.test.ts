import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceService, VoiceServiceCallbacks } from '../voice.service';
import { VoiceSettings } from '@syncwatch/shared';

// Mock simple-peer
vi.mock('simple-peer', () => {
  return {
    default: class MockPeer {
      on = vi.fn();
      signal = vi.fn();
      destroy = vi.fn();
    },
  };
});

describe('VoiceService', () => {
  let voiceService: VoiceService;
  let callbacks: VoiceServiceCallbacks;
  let settings: VoiceSettings;

  beforeEach(() => {
    callbacks = {
      onSignal: vi.fn(),
      onSpeaking: vi.fn(),
      onPeerConnected: vi.fn(),
      onPeerDisconnected: vi.fn(),
      onPeerStream: vi.fn(),
      onError: vi.fn(),
    };

    settings = {
      mode: 'push_to_talk',
      pttKey: 'Space',
      vadThreshold: 0.3,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
    };

    voiceService = new VoiceService(callbacks, settings);
  });

  afterEach(() => {
    voiceService.destroy();
  });

  it('should create voice service', () => {
    expect(voiceService).toBeDefined();
  });

  it('should set ICE servers', () => {
    const iceServers = [{ urls: 'stun:stun.example.com:19302' }];
    voiceService.setIceServers(iceServers);
    // No error should be thrown
    expect(true).toBe(true);
  });

  it('should mute and unmute microphone', () => {
    voiceService.muteMicrophone();
    voiceService.unmuteMicrophone();
    // No error should be thrown
    expect(true).toBe(true);
  });

  it('should update settings', () => {
    voiceService.updateSettings({ mode: 'voice_activity', vadThreshold: 0.5 });
    // No error should be thrown
    expect(true).toBe(true);
  });

  it('should get connected peers', () => {
    const peers = voiceService.getConnectedPeers();
    expect(Array.isArray(peers)).toBe(true);
    expect(peers.length).toBe(0);
  });
});
