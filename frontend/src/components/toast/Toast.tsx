import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Toast as ToastType } from './types';
import { GlassButton } from '../ui/glass';

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastColors = {
  success: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  error: 'from-red-500/20 to-rose-500/20 border-red-500/30',
  warning: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  info: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
};

const iconColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

/**
 * Individual Toast Component
 */
export function Toast({ toast, onClose }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = toastIcons[toast.type];

  // Pause auto-dismiss on hover
  useEffect(() => {
    if (isHovered || !toast.duration || toast.duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [isHovered, toast.id, toast.duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative overflow-hidden rounded-lg border backdrop-blur-md
        bg-gradient-to-br ${toastColors[toast.type]}
        shadow-lg min-w-[300px] max-w-md
      `}
    >
      <div className="p-4 flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`} />

        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">{toast.message}</p>
          {toast.description && (
            <p className="text-gray-300 text-xs mt-1">{toast.description}</p>
          )}
          {toast.action && (
            <div className="mt-2">
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => {
                  toast.action?.onClick();
                  onClose(toast.id);
                }}
              >
                {toast.action.label}
              </GlassButton>
            </div>
          )}
        </div>

        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && !isHovered && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
            toast.type === 'success' ? 'from-green-500 to-emerald-500' :
            toast.type === 'error' ? 'from-red-500 to-rose-500' :
            toast.type === 'warning' ? 'from-yellow-500 to-amber-500' :
            'from-blue-500 to-cyan-500'
          } origin-left`}
        />
      )}
    </motion.div>
  );
}
