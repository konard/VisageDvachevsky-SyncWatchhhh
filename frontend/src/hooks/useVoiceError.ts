import { useCallback } from 'react';
import { useToast } from '../components/toast';

/**
 * WebRTC error types
 */
export enum VoiceErrorType {
  PERMISSION_DENIED = 'permission_denied',
  DEVICE_NOT_FOUND = 'device_not_found',
  CONNECTION_FAILED = 'connection_failed',
  PEER_CONNECTION_FAILED = 'peer_connection_failed',
  STREAM_ERROR = 'stream_error',
  GENERIC = 'generic',
}

/**
 * Get user-friendly error message for voice errors
 */
function getVoiceErrorMessage(type: VoiceErrorType, error?: Error): string {
  switch (type) {
    case VoiceErrorType.PERMISSION_DENIED:
      return 'Microphone access denied. Please enable microphone permissions.';
    case VoiceErrorType.DEVICE_NOT_FOUND:
      return 'No microphone found. Please connect a microphone and try again.';
    case VoiceErrorType.CONNECTION_FAILED:
      return 'Failed to establish voice connection. Please check your network.';
    case VoiceErrorType.PEER_CONNECTION_FAILED:
      return 'Voice connection with participant failed. Retrying...';
    case VoiceErrorType.STREAM_ERROR:
      return 'Audio stream error. Please try reconnecting.';
    default:
      return error?.message || 'Voice connection error occurred.';
  }
}

/**
 * Hook for handling voice connection errors
 */
export function useVoiceError() {
  const toast = useToast();

  const handleVoiceError = useCallback(
    (type: VoiceErrorType, error?: Error, canRetry: boolean = false) => {
      const message = getVoiceErrorMessage(type, error);

      toast.error(message, {
        duration: canRetry ? 5000 : 0, // Auto-dismiss if retry available
        action: canRetry
          ? undefined
          : {
              label: 'Dismiss',
              onClick: () => {},
            },
      });

      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Voice Error:', type, error);
      }
    },
    [toast]
  );

  const handlePermissionError = useCallback(
    (error: Error) => {
      handleVoiceError(VoiceErrorType.PERMISSION_DENIED, error);

      // Optionally show instructions
      toast.info('How to enable microphone', {
        description: 'Click the lock icon in your browser address bar and allow microphone access.',
        duration: 10000,
      });
    },
    [handleVoiceError, toast]
  );

  const handleDeviceError = useCallback(
    (error: Error) => {
      handleVoiceError(VoiceErrorType.DEVICE_NOT_FOUND, error);
    },
    [handleVoiceError]
  );

  const handleConnectionError = useCallback(
    (error: Error, canRetry: boolean = true) => {
      handleVoiceError(VoiceErrorType.CONNECTION_FAILED, error, canRetry);
    },
    [handleVoiceError]
  );

  const handlePeerConnectionError = useCallback(
    (peerId: string, error: Error) => {
      handleVoiceError(VoiceErrorType.PEER_CONNECTION_FAILED, error, true);

      // Log specific peer error
      if (process.env.NODE_ENV === 'development') {
        console.error(`Peer connection error with ${peerId}:`, error);
      }
    },
    [handleVoiceError]
  );

  const handleStreamError = useCallback(
    (error: Error) => {
      handleVoiceError(VoiceErrorType.STREAM_ERROR, error);
    },
    [handleVoiceError]
  );

  return {
    handleVoiceError,
    handlePermissionError,
    handleDeviceError,
    handleConnectionError,
    handlePeerConnectionError,
    handleStreamError,
  };
}
