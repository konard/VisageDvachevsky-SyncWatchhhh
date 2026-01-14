import { useCallback } from 'react';
import { useToastStore } from './ToastStore';
import { ToastOptions } from './types';

/**
 * Hook for showing toast notifications
 */
export function useToast() {
  const { addToast, removeToast, clearAll } = useToastStore();

  const success = useCallback(
    (message: string, options?: Omit<ToastOptions, 'type'>) => {
      return addToast(message, { ...options, type: 'success' });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: Omit<ToastOptions, 'type'>) => {
      return addToast(message, { ...options, type: 'error' });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: Omit<ToastOptions, 'type'>) => {
      return addToast(message, { ...options, type: 'warning' });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: Omit<ToastOptions, 'type'>) => {
      return addToast(message, { ...options, type: 'info' });
    },
    [addToast]
  );

  const dismiss = useCallback(
    (toastId: string) => {
      removeToast(toastId);
    },
    [removeToast]
  );

  return {
    success,
    error,
    warning,
    info,
    dismiss,
    clearAll,
  };
}
