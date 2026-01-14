import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { SignalData } from 'simple-peer';
import { VoiceService, VoiceServiceCallbacks } from '../services/voice.service';
import { useVoiceStore } from '../stores/voiceStore';

/**
 * Voice hook for managing WebRTC voice connections
 */
export function useVoice(socket: Socket | null) {
  const voiceServiceRef = useRef<VoiceService | null>(null);

  const {
    settings,
    isInVoice,
    setConnectionState,
    setIsInVoice,
    setPeers,
    addPeer,
    removePeer,
    setPeerSpeaking,
    setIsMuted,
    setIsSpeaking,
    setIceServers,
    setError,
    setPeerVolume,
    reset,
  } = useVoiceStore();

  /**
   * Initialize voice service
   */
  useEffect(() => {
    if (!socket) return;

    // Create callbacks
    const callbacks: VoiceServiceCallbacks = {
      onSignal: (targetId, signal) => {
        socket.emit('voice:signal', { targetId, signal });
      },

      onSpeaking: (isSpeaking) => {
        setIsSpeaking(isSpeaking);
        socket.emit('voice:speaking', { isSpeaking });
      },

      onPeerConnected: (peerId) => {
        console.log('Peer connected:', peerId);
      },

      onPeerDisconnected: (peerId) => {
        console.log('Peer disconnected:', peerId);
        removePeer(peerId);
      },

      onPeerStream: (peerId, stream) => {
        console.log('Received stream from peer:', peerId, stream);
      },

      onError: (error) => {
        console.error('Voice service error:', error);
        setError(error.message);
      },
    };

    // Create voice service
    voiceServiceRef.current = new VoiceService(callbacks, settings);

    // Set up socket event listeners
    socket.on('voice:peers', ({ peers }: { peers: string[] }) => {
      console.log('Received voice peers:', peers);
      setPeers(peers);

      // Create peer connections for each existing peer (we are the initiator)
      peers.forEach((peerId) => {
        voiceServiceRef.current?.createPeer(peerId, true);
      });
    });

    socket.on('voice:peer:joined', ({ oderId }: { oderId: string }) => {
      console.log('Peer joined voice:', oderId);
      addPeer(oderId);

      // Create peer connection (they are the initiator, so we wait for signal)
      voiceServiceRef.current?.createPeer(oderId, false);
    });

    socket.on('voice:peer:left', ({ oderId }: { oderId: string }) => {
      console.log('Peer left voice:', oderId);
      voiceServiceRef.current?.removePeer(oderId);
      removePeer(oderId);
    });

    socket.on('voice:signal', ({ fromId, signal }: { fromId: string; signal: SignalData }) => {
      console.log('Received signal from peer:', fromId);
      voiceServiceRef.current?.signal(fromId, signal);
    });

    socket.on('voice:speaking', ({ oderId, isSpeaking }: { oderId: string; isSpeaking: boolean }) => {
      setPeerSpeaking(oderId, isSpeaking);
    });

    socket.on('voice:ice:servers', ({ iceServers }: { iceServers: RTCIceServer[] }) => {
      console.log('Received ICE servers:', iceServers);
      setIceServers(iceServers);
      voiceServiceRef.current?.setIceServers(iceServers);
    });

    // Cleanup on unmount
    return () => {
      socket.off('voice:peers');
      socket.off('voice:peer:joined');
      socket.off('voice:peer:left');
      socket.off('voice:signal');
      socket.off('voice:speaking');
      socket.off('voice:ice:servers');

      if (voiceServiceRef.current) {
        voiceServiceRef.current.destroy();
        voiceServiceRef.current = null;
      }

      reset();
    };
  }, [socket, settings, setPeers, addPeer, removePeer, setPeerSpeaking, setIceServers, setError, setIsSpeaking, reset]);

  /**
   * Update voice service settings when they change
   */
  useEffect(() => {
    if (voiceServiceRef.current && isInVoice) {
      voiceServiceRef.current.updateSettings(settings);
    }
  }, [settings, isInVoice]);

  /**
   * Join voice chat
   */
  const joinVoice = useCallback(async () => {
    if (!socket || isInVoice) return;

    try {
      setConnectionState('connecting');
      setError(null);

      // Get microphone permission
      await voiceServiceRef.current?.getMicrophone();

      // Set up push-to-talk if needed
      if (settings.mode === 'push_to_talk') {
        voiceServiceRef.current?.setupPushToTalk();
      }

      // Emit join event to server
      socket.emit('voice:join', {});

      setIsInVoice(true);
      setConnectionState('connected');
    } catch (error) {
      const err = error as Error;
      console.error('Failed to join voice:', err);
      setError(err.message);
      setConnectionState('disconnected');
      setIsInVoice(false);
    }
  }, [socket, isInVoice, settings, setConnectionState, setIsInVoice, setError]);

  /**
   * Leave voice chat
   */
  const leaveVoice = useCallback(() => {
    if (!socket || !isInVoice) return;

    try {
      // Emit leave event to server
      socket.emit('voice:leave', {});

      // Stop microphone
      voiceServiceRef.current?.stopMicrophone();

      setIsInVoice(false);
      setConnectionState('disconnected');
      reset();
    } catch (error) {
      const err = error as Error;
      console.error('Failed to leave voice:', err);
      setError(err.message);
    }
  }, [socket, isInVoice, setIsInVoice, setConnectionState, reset, setError]);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (!voiceServiceRef.current) return;

    const newMutedState = !useVoiceStore.getState().isMuted;

    if (newMutedState) {
      voiceServiceRef.current.muteMicrophone();
    } else {
      voiceServiceRef.current.unmuteMicrophone();
    }

    setIsMuted(newMutedState);
  }, [setIsMuted]);

  /**
   * Set peer volume
   */
  const setPeerVolumeControl = useCallback(
    (peerId: string, volume: number) => {
      voiceServiceRef.current?.setPeerVolume(peerId, volume);
      setPeerVolume(peerId, volume);
    },
    [setPeerVolume]
  );

  return {
    joinVoice,
    leaveVoice,
    toggleMute,
    setPeerVolume: setPeerVolumeControl,
  };
}
