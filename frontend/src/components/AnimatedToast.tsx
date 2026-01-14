import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../hooks';
import { toastVariants, getVariants } from '../utils/animations';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AnimatedToastProps {
  toast: Toast | null;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

/**
 * Animated toast notification
 * Slides in from the right with scale animation
 */
export const AnimatedToast = ({
  toast,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
}: AnimatedToastProps) => {
  const prefersReducedMotion = useReducedMotion();

  // Auto close
  useEffect(() => {
    if (toast && autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [toast, autoClose, autoCloseDelay, onClose]);

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-yellow-600 border-yellow-500',
  };

  const typeIcons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            variants={getVariants(toastVariants, prefersReducedMotion)}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg
              border shadow-lg backdrop-blur-sm min-w-[300px]
              ${typeStyles[toast.type]}
            `}
          >
            <span className="text-2xl">{typeIcons[toast.type]}</span>
            <p className="flex-1 text-white font-medium">{toast.message}</p>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close notification"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
