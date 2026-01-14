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
  gainNode?: GainNode; // For per-user volume control
  analyserNode?: AnalyserNode; // For audio level visualization
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastReconnectTime?: number;
  iceRestartAttempts: number;
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
  onPeerAudioLevel: (peerId: string, level: number) => void;
  onPeerQuality: (peerId: string, quality: VoiceQualityStats) => void;
  onError: (error: Error) => void;
}

/**
 * Voice quality stats (from shared types)
 */
interface VoiceQualityStats {
  peerId: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate: number;
  packetLoss: number;
  jitter: number;
  latency: number;
  timestamp: number;
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
  private pttMouseButtonDown = false;

  // Quality monitoring
  private qualityMonitorInterval: number | null = null;
  private peerAudioLevelIntervals = new Map<string, number>();

  // Reconnection constants
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly BASE_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds
  private readonly MAX_ICE_RESTART_ATTEMPTS = 3;

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
        reconnectAttempts: 0,
        iceRestartAttempts: 0,
      };

      this.peers.set(peerId, peerConnection);

      // Handle signaling
      peer.on('signal', (signal: SignalData) => {
        this.callbacks.onSignal(peerId, signal);
      });

      // Handle remote stream
      peer.on('stream', (stream: MediaStream) => {
        peerConnection.stream = stream;

        // Create Web Audio API chain for volume control and audio analysis
        if (!this.audioContext) {
          this.audioContext = new AudioContext();
        }

        // Create audio source from stream
        const source = this.audioContext.createMediaStreamSource(stream);

        // Create gain node for volume control (0-200%)
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0; // Default 100%
        peerConnection.gainNode = gainNode;

        // Create analyser for audio level visualization
        const analyserNode = this.audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        peerConnection.analyserNode = analyserNode;

        // Connect: source -> gain -> analyser -> destination
        source.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(this.audioContext.destination);

        // Start monitoring audio levels
        this.startPeerAudioLevelMonitoring(peerId);

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
   * Set volume for a specific peer (0-2 range for 0-200%)
   */
  setPeerVolume(peerId: string, volume: number): void {
    const peerConnection = this.peers.get(peerId);
    if (peerConnection && peerConnection.gainNode) {
      // Clamp volume to 0-2 range (0-200%)
      const clampedVolume = Math.max(0, Math.min(2, volume));
      peerConnection.gainNode.gain.value = clampedVolume;
    }
  }

  /**
   * Set local mute for a specific peer
   */
  setPeerMuted(peerId: string, isMuted: boolean): void {
    const peerConnection = this.peers.get(peerId);
    if (peerConnection && peerConnection.gainNode) {
      // Mute by setting gain to 0, unmute by restoring previous volume
      // Store the previous volume in a data attribute
      if (isMuted) {
        peerConnection.gainNode.gain.value = 0;
      } else {
        // Restore to default or previously set volume
        peerConnection.gainNode.gain.value = 1.0;
      }
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
   * Start monitoring audio levels for a peer
   */
  private startPeerAudioLevelMonitoring(peerId: string): void {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection || !peerConnection.analyserNode) {
      return;
    }

    const analyser = peerConnection.analyserNode;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const monitorInterval = window.setInterval(() => {
      if (!this.peers.has(peerId)) {
        clearInterval(monitorInterval);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = average / 255; // Normalize to 0-1

      this.callbacks.onPeerAudioLevel(peerId, level);
    }, 100); // Update every 100ms

    this.peerAudioLevelIntervals.set(peerId, monitorInterval);
  }

  /**
   * Start monitoring connection quality for all peers
   */
  startQualityMonitoring(): void {
    if (this.qualityMonitorInterval) {
      return;
    }

    this.qualityMonitorInterval = window.setInterval(() => {
      for (const [peerId, peerConnection] of this.peers.entries()) {
        if (peerConnection.isConnected && peerConnection.peer) {
          this.monitorPeerQuality(peerId, peerConnection);
        }
      }
    }, 1000); // Update every second
  }

  /**
   * Monitor quality stats for a specific peer
   */
  private async monitorPeerQuality(peerId: string, peerConnection: PeerConnection): Promise<void> {
    try {
      // Access the underlying RTCPeerConnection
      const pc = (peerConnection.peer as any)._pc as RTCPeerConnection;
      if (!pc) return;

      const stats = await pc.getStats();
      let bitrate = 0;
      let packetLoss = 0;
      let jitter = 0;
      let latency = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          // Calculate bitrate
          if (report.bytesReceived !== undefined) {
            bitrate = Math.round((report.bytesReceived * 8) / 1000); // kbps
          }

          // Get packet loss
          if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
            const totalPackets = report.packetsLost + report.packetsReceived;
            packetLoss = totalPackets > 0 ? (report.packetsLost / totalPackets) * 100 : 0;
          }

          // Get jitter
          if (report.jitter !== undefined) {
            jitter = Math.round(report.jitter * 1000); // Convert to ms
          }
        }

        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          // Get RTT (round-trip time / latency)
          if (report.currentRoundTripTime !== undefined) {
            latency = Math.round(report.currentRoundTripTime * 1000); // Convert to ms
          }
        }
      });

      // Determine quality based on metrics
      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
      if (packetLoss > 5 || jitter > 50 || latency > 200) {
        quality = 'poor';
      } else if (packetLoss > 2 || jitter > 30 || latency > 150) {
        quality = 'fair';
      } else if (packetLoss > 1 || jitter > 20 || latency > 100) {
        quality = 'good';
      }

      this.callbacks.onPeerQuality(peerId, {
        peerId,
        quality,
        bitrate,
        packetLoss,
        jitter,
        latency,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`Failed to get quality stats for peer ${peerId}:`, error);
    }
  }

  /**
   * Attempt ICE restart for a peer
   */
  async attemptICERestart(peerId: string): Promise<boolean> {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection || peerConnection.iceRestartAttempts >= this.MAX_ICE_RESTART_ATTEMPTS) {
      return false;
    }

    try {
      console.log(`Attempting ICE restart for peer ${peerId} (attempt ${peerConnection.iceRestartAttempts + 1})`);
      peerConnection.iceRestartAttempts++;

      // Access the underlying RTCPeerConnection
      const pc = (peerConnection.peer as any)._pc as RTCPeerConnection;
      if (!pc) return false;

      // Create new offer with iceRestart option
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      // Signal the new offer
      this.callbacks.onSignal(peerId, offer);

      return true;
    } catch (error) {
      console.error(`ICE restart failed for peer ${peerId}:`, error);
      return false;
    }
  }

  /**
   * Reconnect to peer with exponential backoff
   */
  private async reconnectPeer(peerId: string): Promise<void> {
    const peerConnection = this.peers.get(peerId);
    if (!peerConnection || !peerConnection.isReconnecting) {
      return;
    }

    // Check if we've exceeded max attempts
    if (peerConnection.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`Max reconnection attempts reached for peer ${peerId}`);
      this.callbacks.onError(new Error(`Failed to reconnect to peer ${peerId} after ${this.MAX_RECONNECT_ATTEMPTS} attempts`));
      this.removePeer(peerId);
      return;
    }

    // Try ICE restart first (if under limit)
    if (peerConnection.iceRestartAttempts < this.MAX_ICE_RESTART_ATTEMPTS) {
      const iceRestarted = await this.attemptICERestart(peerId);
      if (iceRestarted) {
        peerConnection.reconnectAttempts++;
        peerConnection.lastReconnectTime = Date.now();
        return;
      }
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.BASE_RECONNECT_DELAY * Math.pow(2, peerConnection.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    console.log(`Reconnecting to peer ${peerId} in ${delay}ms (attempt ${peerConnection.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(async () => {
      if (!this.peers.has(peerId)) return;

      peerConnection.reconnectAttempts++;
      peerConnection.lastReconnectTime = Date.now();

      try {
        // Remove old peer
        this.removePeer(peerId);

        // Create new peer as initiator
        await this.createPeer(peerId, true);
      } catch (error) {
        const err = error as Error;
        console.error(`Failed to reconnect to peer ${peerId}:`, err);

        // Try again with next backoff
        if (peerConnection.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectPeer(peerId);
        } else {
          this.callbacks.onError(new Error(`Reconnection failed: ${err.message}`));
        }
      }
    }, delay);
  }

  /**
   * Enhanced push-to-talk with mouse button support
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

    const handleMouseDown = (e: MouseEvent) => {
      if (this.settings.pttMouseButton && e.button === this.settings.pttMouseButton && !this.pttMouseButtonDown) {
        e.preventDefault();
        this.pttMouseButtonDown = true;
        this.unmuteMicrophone();
        this.callbacks.onSpeaking(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (this.settings.pttMouseButton && e.button === this.settings.pttMouseButton && this.pttMouseButtonDown) {
        e.preventDefault();
        this.pttMouseButtonDown = false;
        this.muteMicrophone();
        this.callbacks.onSpeaking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Store cleanup function
    this.cleanupPTT = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }

  /**
   * Stop quality monitoring
   */
  stopQualityMonitoring(): void {
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
      this.qualityMonitorInterval = null;
    }
  }

  /**
   * Destroy all connections and cleanup
   */
  destroy(): void {
    // Stop quality monitoring
    this.stopQualityMonitoring();

    // Clear peer audio level intervals
    for (const interval of this.peerAudioLevelIntervals.values()) {
      clearInterval(interval);
    }
    this.peerAudioLevelIntervals.clear();

    // Remove all peers
    for (const peerId of this.peers.keys()) {
      this.removePeer(peerId);
    }

    // Stop microphone
    this.stopMicrophone();
  }
}
