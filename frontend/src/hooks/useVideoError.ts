import { useCallback } from 'react';
import { useToast } from '../components/toast';

/**
 * YouTube player error codes
 */
export enum YouTubeErrorCode {
  INVALID_PARAM = 2,
  HTML5_ERROR = 5,
  VIDEO_NOT_FOUND = 100,
  NOT_EMBEDDABLE = 101,
  NOT_EMBEDDABLE_OWNER = 150,
}

/**
 * Get user-friendly error message for YouTube errors
 */
function getYouTubeErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case YouTubeErrorCode.INVALID_PARAM:
      return 'Invalid video parameter. Please check the video URL.';
    case YouTubeErrorCode.HTML5_ERROR:
      return 'Video playback error. Try refreshing the page.';
    case YouTubeErrorCode.VIDEO_NOT_FOUND:
      return 'Video not found or has been removed.';
    case YouTubeErrorCode.NOT_EMBEDDABLE:
    case YouTubeErrorCode.NOT_EMBEDDABLE_OWNER:
      return 'This video cannot be played in embedded players.';
    default:
      return 'Video playback error. Please try again.';
  }
}

/**
 * Hook for handling video playback errors
 */
export function useVideoError() {
  const toast = useToast();

  const handleYouTubeError = useCallback(
    (error: YT.PlayerError) => {
      const message = getYouTubeErrorMessage(error);

      toast.error(message, {
        description: `Error code: ${error}`,
        action: {
          label: 'Refresh',
          onClick: () => {
            window.location.reload();
          },
        },
      });

      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('YouTube Player Error:', error);
      }
    },
    [toast]
  );

  const handleGenericVideoError = useCallback(
    (error: string | Error, context?: string) => {
      const message = typeof error === 'string' ? error : error.message;

      toast.error(context ? `${context}: ${message}` : message, {
        action: {
          label: 'Refresh',
          onClick: () => {
            window.location.reload();
          },
        },
      });

      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Video Error:', error);
      }
    },
    [toast]
  );

  return {
    handleYouTubeError,
    handleGenericVideoError,
  };
}
