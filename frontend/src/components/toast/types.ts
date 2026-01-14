/**
 * Toast notification types and interfaces
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastOptions {
  type?: ToastType;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
