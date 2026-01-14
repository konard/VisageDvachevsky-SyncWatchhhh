import { useCallback } from 'react';
import { useToast } from '../components/toast';
import { getErrorMessage, parseApiError, isAuthError } from '../utils/api/errorHandler';

/**
 * Hook for handling API errors with user feedback
 */
export function useApiError() {
  const toast = useToast();

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const errorInfo = parseApiError(error);
      const message = customMessage || errorInfo.message;

      // Show toast notification
      toast.error(message, {
        description: errorInfo.details
          ? JSON.stringify(errorInfo.details)
          : undefined,
      });

      // Handle auth errors
      if (isAuthError(error)) {
        // Optionally redirect to login
        // setTimeout(() => {
        //   window.location.href = '/login';
        // }, 1500);
      }

      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      return errorInfo;
    },
    [toast]
  );

  return {
    handleError,
    getErrorMessage,
  };
}
