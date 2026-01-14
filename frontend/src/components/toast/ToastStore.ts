import { create } from 'zustand';
import { Toast, ToastOptions } from './types';

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastCounter = 0;

/**
 * Zustand store for managing toast notifications
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (message: string, options: ToastOptions = {}) => {
    const id = `toast-${Date.now()}-${toastCounter++}`;
    const toast: Toast = {
      id,
      message,
      type: options.type || 'info',
      description: options.description,
      duration: options.duration ?? 5000, // Default 5 seconds
      action: options.action,
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove toast after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));
