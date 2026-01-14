/**
 * useDiagnostics Hook
 * Aggregates diagnostics data from various sources and updates the diagnostics store
 */

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useDiagnosticsStore } from '../stores/diagnostics.store';
import { usePlaybackStore } from '../stores/playback.store';
import { useVoiceStore } from '../stores/voiceStore';
import { ConnectionStatus } from './websocket/useSocket';
import { analyticsService } from '../services/analytics.service';

export interface UseDiagnosticsOptions {
  /**
   * Socket instance for network metrics
   */
  socket: Socket | null;

  /**
   * Connection status from useSocket
   */
  connectionStatus: ConnectionStatus;

  /**
   * Clock offset in milliseconds from useClockSync
   */
  clockOffset: number;

  /**
   * Round-trip time in milliseconds from useClockSync
   */
  rtt: number;

  /**
   * Server time getter function from useClockSync
   */
  getServerTime: () => number;

  /**
   * Room ID (if in a room)
   */
  roomId?: string;

  /**
   * User ID (if logged in)
   */
  userId?: string;

  /**
   * Update interval in milliseconds (default: 1000 = 1s)
   */
  updateInterval?: number;
}

/**
 * Custom hook for collecting and managing diagnostics data
 *
 * This hook:
 * - Collects metrics from various sources (sync, voice, socket, network)
 * - Updates the diagnostics store periodically
 * - Tracks drift history for timeline visualization
 * - Sends diagnostics snapshots to analytics service
 */
export function useDiagnostics(options: UseDiagnosticsOptions) {
  const {
    // socket is available for future use if needed
    socket: _socket,
    connectionStatus,
    clockOffset,
    rtt,
    getServerTime,
    roomId,
    userId,
    updateInterval = 1000, // 1 second
  } = options;

  const {
    updateNetworkMetrics,
    updateSyncMetrics,
    updateVoiceMetrics,
    updateSocketMetrics,
    addDriftPoint,
  } = useDiagnosticsStore();

  const playbackState = usePlaybackStore((state) => state.playbackState);
  const drift = usePlaybackStore((state) => state.drift);
  const commandBuffer = usePlaybackStore((state) => state.commandBuffer);

  const voiceConnectionState = useVoiceStore((state) => state.connectionState);
  const peers = useVoiceStore((state) => state.peers);

  const lastDriftRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const lastConnectionStatusRef = useRef<ConnectionStatus>(connectionStatus);
  const rttSamplesRef = useRef<number[]>([]);
  const MAX_RTT_SAMPLES = 10;

  /**
   * Calculate network jitter from RTT samples
   */
  const calculateJitter = useCallback((samples: number[]): number => {
    if (samples.length < 2) return 0;

    let totalVariation = 0;
    for (let i = 1; i < samples.length; i++) {
      totalVariation += Math.abs(samples[i] - samples[i - 1]);
    }

    return totalVariation / (samples.length - 1);
  }, []);

  /**
   * Track reconnection attempts
   */
  useEffect(() => {
    if (connectionStatus === 'reconnecting') {
      reconnectAttemptsRef.current++;
    } else if (connectionStatus === 'connected') {
      reconnectAttemptsRef.current = 0;
    }
    lastConnectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  /**
   * Update RTT samples for jitter calculation
   */
  useEffect(() => {
    if (rtt > 0) {
      rttSamplesRef.current.push(rtt);
      if (rttSamplesRef.current.length > MAX_RTT_SAMPLES) {
        rttSamplesRef.current.shift();
      }
    }
  }, [rtt]);

  /**
   * Collect and update all diagnostics metrics
   */
  const collectMetrics = useCallback(() => {
    if (!roomId) return;

    const now = Date.now();
    const serverTimeMs = getServerTime();
    const localTimeMs = Date.now();

    // Network metrics
    const jitterMs = calculateJitter(rttSamplesRef.current);
    const latencyMs = rtt;
    // Packet loss estimation (based on connection quality)
    // In a real implementation, this would come from WebRTC stats
    const packetLoss = connectionStatus === 'connected' ? 0 :
                       connectionStatus === 'reconnecting' ? 5 : 10;

    updateNetworkMetrics({
      latencyMs: Math.round(latencyMs),
      jitterMs: Math.round(jitterMs),
      packetLoss,
    });

    // Sync metrics
    const playbackRate = playbackState?.playbackRate || 1.0;
    const bufferHealth = commandBuffer.length > 0 ? 0.5 : 1.0; // Simplified calculation

    updateSyncMetrics({
      serverTimeMs,
      localTimeMs,
      clockOffsetMs: clockOffset,
      driftMs: drift,
      bufferHealth,
      playbackRate,
    });

    // Socket metrics
    const socketState =
      connectionStatus === 'connected' ? 'connected' :
      connectionStatus === 'reconnecting' ? 'reconnecting' :
      'disconnected';

    updateSocketMetrics({
      socketState,
      reconnectAttempts: reconnectAttemptsRef.current,
    });

    // Voice metrics (aggregate from peers)
    if (peers.size > 0) {
      let totalAudioLevel = 0;
      let iceState = 'new';

      peers.forEach((peer) => {
        totalAudioLevel += peer.audioLevel || 0;
        // Use the most advanced ICE state - check if peer has latency data
        if (peer.latency !== undefined) {
          iceState = 'connected';
        }
      });

      const avgAudioLevel = totalAudioLevel / peers.size;

      updateVoiceMetrics({
        connectionState: voiceConnectionState,
        audioLevel: avgAudioLevel,
        iceState,
      });
    } else {
      updateVoiceMetrics({
        connectionState: voiceConnectionState,
        audioLevel: 0,
        iceState: 'disconnected',
      });
    }

    // Track drift changes for timeline
    if (Math.abs(drift - lastDriftRef.current) > 10) { // Only track significant changes
      addDriftPoint({
        timestamp: now,
        driftMs: drift,
        videoSource: playbackState ? 'active' : undefined,
        playbackRate,
      });
      lastDriftRef.current = drift;
    }

    // Send diagnostics snapshot to analytics (throttled)
    // Only send every 10 updates (every 10 seconds if update interval is 1s)
    if (Math.floor(now / (updateInterval * 10)) !== Math.floor((now - updateInterval) / (updateInterval * 10))) {
      analyticsService.sendDiagnosticsSnapshot({
        roomId,
        userId,
        latencyMs: Math.round(latencyMs),
        jitterMs: Math.round(jitterMs),
        packetLoss,
        serverTimeMs,
        localTimeMs,
        clockOffsetMs: clockOffset,
        driftMs: drift,
        bufferHealth,
        playbackRate,
        voiceState: voiceConnectionState,
        audioLevel: 0,
        iceState: 'new',
        socketState,
        reconnectAttempts: reconnectAttemptsRef.current,
      });
    }
  }, [
    roomId,
    userId,
    getServerTime,
    calculateJitter,
    rtt,
    connectionStatus,
    playbackState,
    drift,
    clockOffset,
    commandBuffer,
    voiceConnectionState,
    peers,
    updateNetworkMetrics,
    updateSyncMetrics,
    updateSocketMetrics,
    updateVoiceMetrics,
    addDriftPoint,
    updateInterval,
  ]);

  /**
   * Set up periodic metrics collection
   */
  useEffect(() => {
    if (!roomId) return;

    // Collect immediately
    collectMetrics();

    // Then collect periodically
    const interval = setInterval(collectMetrics, updateInterval);

    return () => {
      clearInterval(interval);
    };
  }, [roomId, collectMetrics, updateInterval]);

  /**
   * Track sync corrections
   */
  const trackSyncCorrection = useCallback((
    correctionType: 'soft' | 'hard',
    targetTimeMs: number,
    actualTimeMs: number,
    videoSource?: string
  ) => {
    if (!roomId) return;

    const driftMs = Math.round(drift);
    const wasPlaying = playbackState?.isPlaying || false;
    const playbackRate = playbackState?.playbackRate || 1.0;

    // Add to drift timeline
    addDriftPoint({
      timestamp: Date.now(),
      driftMs,
      correctionType,
      videoSource,
      playbackRate,
    });

    // Track via analytics service
    analyticsService.trackSyncCorrection({
      roomId,
      userId,
      correctionType,
      driftMs,
      targetTimeMs,
      actualTimeMs,
      videoSource,
      playbackRate,
      wasPlaying,
    });
  }, [roomId, userId, drift, playbackState, addDriftPoint]);

  /**
   * Track voice join attempt
   */
  const trackVoiceJoinAttempt = useCallback((
    success: boolean,
    failureReason?: string,
    joinTimeMs?: number,
    iceState?: string,
    candidatesCount?: number,
    turnUsed?: boolean
  ) => {
    if (!roomId) return;

    analyticsService.trackVoiceJoinAttempt({
      roomId,
      userId,
      success,
      failureReason,
      joinTimeMs,
      iceState,
      candidatesCount,
      turnUsed,
    });
  }, [roomId, userId]);

  return {
    trackSyncCorrection,
    trackVoiceJoinAttempt,
  };
}
