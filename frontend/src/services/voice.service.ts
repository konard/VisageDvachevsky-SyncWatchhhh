import Peer from 'simple-peer';
import type { Instance, SignalData } from 'simple-peer';
import { VoiceSettings } from '@syncwatch/shared';

/**
 * Peer connection state
 */
export interface PeerConnection {
  peerId: string;
  peer: Instance;
  stream?: MediaStream;
  audioElement?: HTMLAudioElement;
  isConnected: boolean;
  isReconnecting: boolean;
}

/**
 * Voice service callbacks
 */
export interface VoiceServiceCallbacks {
  onSignal: (targetId: string, signal: SignalData) => void;
  onSpeaking: (isSpeaking: boolean) => void;
  onPeerConnected: (peerId: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onPeerStream: (peerId: string, stream: MediaStream) => void;
  onError: (error: Error) => void;
}

/**
 * WebRTC Voice Service
 * Manages P2P audio connections using simple-peer
 */
export class VoiceService {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerConnection>();
  private callbacks: VoiceServiceCallbacks;
  private settings: VoiceSettings;
  private iceServers: RTCIceServer[] = [];

  // Voice Activity Detection
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: number | null = null;
  private isSpeaking = false;

  // Push-to-Talk
  private pttKeyDown = false;

  constructor(callbacks: VoiceServiceCallbacks, settings: VoiceSettings) {
    this.callbacks = callbacks;
    this.settings = settings;
  }

  /**
   * Request microphone permission and get local stream
   */
  async getMicrophone(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.settings.echoCancellation,
          noiseSuppression: this.settings.noiseSuppression,
          autoGainControl: this.settings.autoGainControl,
        },
        video: false,
      });

      this.localStream = stream;

      // Set up voice activity detection if needed
      if (this.settings.mode === 'voice_activity') {
        this.setupVAD(stream);
      }

      // Start with mic muted if using push-to-talk
      if (this.settings.mode === 'push_to_talk') {
        this.muteMicrophone();
      }

      return stream;
    } catch (error) {
      const err = error as Error;
      this.callbacks.onError(new Error(`Failed to get microphone: ${err.message}`));
      throw error;
    }
  }

  /**
   * Set ICE servers (STUN/TURN)
   */
  setIceServers(iceServers: RTCIceServer[]): void {
    this.iceServers = iceServers;
  }

  /**
   * Create peer connection
   */
  async createPeer(peerId: string, initiator: boolean): Promise<void> {
    if (this.peers.has(peerId)) {
      console.warn(`Peer ${peerId} already exists`);
      return;
    }

    if (!this.localStream) {
      throw new Error('Local stream not initialized');
    }

    try {
      const peer = new Peer({
        initiator,
        stream: this.localStream,
        trickle: true,
        config: {
          iceServers: this.iceServers.length > 0 ? this.iceServers : [
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        },
      });

      const peerConnection: PeerConnection = {
        peerId,
        peer,
        isConnected: false,
        isReconnecting: false,
      };

      this.peers.set(peerId, peerConnection);

      // Handle signaling
      peer.on('signal', (signal: SignalData) => {
        this.callbacks.onSignal(peerId, signal);
      });

      // Handle remote stream
      peer.on('stream', (stream: MediaStream) => {
        peerConnection.stream = stream;

        // Create audio element for playback
        const audioElement = new Audio();
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        audioElement.volume = 1.0;
        peerConnection.audioElement = audioElement;

        this.callbacks.onPeerStream(peerId, stream);
      });

      // Handle connection
      peer.on('connect', () => {
        peerConnection.isConnected = true;
        peerConnection.isReconnecting = false;
        this.callbacks.onPeerConnected(peerId);
      });

      // Handle errors
      peer.on('error', (err: Error) => {
        console.error(`Peer ${peerId} error:`, err);

        // Attempt reconnection
        if (peerConnection.isConnected && !peerConnection.isReconnecting) {
          peerConnection.isReconnecting = true;
          setTimeout(() => this.reconnectPeer(peerId), 2000);
        } else {
          this.callbacks.onError(new Error(`Peer ${peerId} error: ${err.message}`));
        }
      });

      // Handle close
      peer.on('close', () => {
        this.removePeer(peerId);
        this.callbacks.onPeerDisconnected(peerId);
      });
    } catch (error) {
      const err = error as Error;
      this.callbacks.onError(new Error(`Failed to create peer: ${err.message}`));
      throw error;
    }
  }

  /**
   * Signal to peer
   */
  signal(peerId: string, signal: SignalData): void {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection) {
      console.warn(`Peer ${peerId} not found for signaling`);
      return;
    }

    try {
      peerConnection.peer.signal(signal);
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to signal peer ${peerId}:`, err);
    }
  }

  /**
   * Remove peer connection
   */
  removePeer(peerId: string): void {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection) {
      return;
    }

    // Clean up audio element
    if (peerConnection.audioElement) {
      peerConnection.audioElement.pause();
      peerConnection.audioElement.srcObject = null;
    }

    // Destroy peer
    if (peerConnection.peer) {
      peerConnection.peer.destroy();
    }

    this.peers.delete(peerId);
  }

  /**
   * Reconnect to peer
   */
  private async reconnectPeer(peerId: string): Promise<void> {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection || !peerConnection.isReconnecting) {
      return;
    }

    try {
      // Remove old peer
      this.removePeer(peerId);

      // Create new peer as initiator
      await this.createPeer(peerId, true);
    } catch (error) {
      const err = error as Error;
      console.error(`Failed to reconnect to peer ${peerId}:`, err);
      this.callbacks.onError(new Error(`Reconnection failed: ${err.message}`));
    }
  }

  /**
   * Set up Voice Activity Detection
   */
  private setupVAD(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Check voice activity every 100ms
      this.vadInterval = window.setInterval(() => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const threshold = (this.settings.vadThreshold ?? 0.3) * 255;

        const wasSpeaking = this.isSpeaking;
        this.isSpeaking = average > threshold;

        // Notify if speaking state changed
        if (wasSpeaking !== this.isSpeaking) {
          this.callbacks.onSpeaking(this.isSpeaking);

          // Unmute/mute microphone based on speaking
          if (this.isSpeaking) {
            this.unmuteMicrophone();
          } else {
            this.muteMicrophone();
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to set up VAD:', error);
    }
  }

  /**
   * Enable push-to-talk
   */
  setupPushToTalk(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === this.settings.pttKey && !this.pttKeyDown) {
        this.pttKeyDown = true;
        this.unmuteMicrophone();
        this.callbacks.onSpeaking(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === this.settings.pttKey && this.pttKeyDown) {
        this.pttKeyDown = false;
        this.muteMicrophone();
        this.callbacks.onSpeaking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Store cleanup function
    this.cleanupPTT = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  private cleanupPTT?: () => void;

  /**
   * Mute microphone
   */
  muteMicrophone(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
  }

  /**
   * Unmute microphone
   */
  unmuteMicrophone(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  }

  /**
   * Set volume for a specific peer
   */
  setPeerVolume(peerId: string, volume: number): void {
    const peerConnection = this.peers.get(peerId);
    if (peerConnection && peerConnection.audioElement) {
      peerConnection.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get all connected peers
   */
  getConnectedPeers(): string[] {
    return Array.from(this.peers.keys()).filter((peerId) => {
      const peer = this.peers.get(peerId);
      return peer && peer.isConnected;
    });
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Update VAD if mode changed
    if (settings.mode === 'voice_activity' && !this.vadInterval) {
      if (this.localStream) {
        this.setupVAD(this.localStream);
      }
    } else if (settings.mode === 'push_to_talk' && this.vadInterval) {
      this.cleanupVAD();
      this.setupPushToTalk();
    }

    // Update audio constraints if needed
    if (
      settings.echoCancellation !== undefined ||
      settings.noiseSuppression !== undefined ||
      settings.autoGainControl !== undefined
    ) {
      // Restart microphone with new settings
      this.stopMicrophone();
      this.getMicrophone();
    }
  }

  /**
   * Stop microphone
   */
  stopMicrophone(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.cleanupVAD();

    if (this.cleanupPTT) {
      this.cleanupPTT();
    }
  }

  /**
   * Clean up VAD
   */
  private cleanupVAD(): void {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
  }

  /**
   * Destroy all connections and cleanup
   */
  destroy(): void {
    // Remove all peers
    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }

    // Stop microphone
    this.stopMicrophone();
  }
}
