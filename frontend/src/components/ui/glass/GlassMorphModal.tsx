import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useMorphTransition } from '../../../hooks/useMorphTransition';
import { useMorphTransitionContextOptional } from '../../../contexts/MorphTransitionContext';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { smoothSpring } from '../../../utils/animations';

export interface GlassMorphModalProps {
  /**
   * Unique morph identifier - should match the source button's morphId
   */
  morphId: string;
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Close callback
   */
  onClose: () => void;
  /**
   * Modal title
   */
  title?: ReactNode;
  /**
   * Modal content
   */
  children: ReactNode;
  /**
   * Additional class names for the modal content
   */
  className?: string;
  /**
   * Modal size
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether clicking overlay closes modal
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean;
  /**
   * Source morph ID to animate from (optional, defaults to morphId + '-source')
   */
  sourceMorphId?: string;
  /**
   * Callback when morph animation completes
   */
  onMorphComplete?: () => void;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * GlassMorphModal - Modal with liquid glass morphing transitions
 *
 * This modal can morph from a source element (like a button) with a matching
 * morphId, creating a seamless liquid-glass transition effect.
 *
 * Usage:
 * ```tsx
 * // Button with matching morphId
 * <GlassMorphButton morphId="create-room" onClick={() => setIsOpen(true)}>
 *   Create Room
 * </GlassMorphButton>
 *
 * // Modal that morphs from the button
 * <GlassMorphModal
 *   morphId="create-room-modal"
 *   sourceMorphId="create-room"
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * >
 *   Modal content...
 * </GlassMorphModal>
 * ```
 */
export function GlassMorphModal({
  morphId,
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  sourceMorphId,
  onMorphComplete,
}: GlassMorphModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const morphContext = useMorphTransitionContextOptional();

  const {
    ref: contentRef,
    isTarget,
    sourceRect,
    morphStyle,
  } = useMorphTransition<HTMLDivElement>({
    morphId,
    isActive: isOpen,
    onMorphComplete: () => {
      morphContext?.completeMorph();
      onMorphComplete?.();
    },
  });

  // Notify context when opening
  useEffect(() => {
    if (isOpen && morphContext && sourceMorphId && !prefersReducedMotion) {
      // Small delay to ensure source rect is captured before modal renders
      const timer = setTimeout(() => {
        morphContext.startMorph(sourceMorphId, morphId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, morphContext, sourceMorphId, morphId, prefersReducedMotion]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Calculate morph animation values
  const getMorphAnimation = () => {
    if (!sourceRect || prefersReducedMotion) {
      // Standard modal animation
      return {
        initial: { opacity: 0, scale: 0.95, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 20 },
      };
    }

    // Morph animation from source element
    // We need to calculate the transform to go FROM the source position
    return {
      initial: {
        opacity: 0.5,
        scale: 0.3,
        borderRadius: sourceRect.borderRadius,
      },
      animate: {
        opacity: 1,
        scale: 1,
        borderRadius: 16, // 2xl rounded
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
      },
    };
  };

  const morphAnimation = getMorphAnimation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'morph-modal-title' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleOverlayClick}
          />

          {/* Modal Content */}
          <motion.div
            ref={contentRef}
            initial={morphAnimation.initial}
            animate={morphAnimation.animate}
            exit={morphAnimation.exit}
            transition={prefersReducedMotion ? { duration: 0 } : {
              ...smoothSpring,
              borderRadius: { duration: 0.3 },
            }}
            className={clsx(
              'glass-card glass-morph-target relative z-10 w-full',
              sizeClasses[size],
              isTarget && 'morph-animating',
              className
            )}
            style={morphStyle}
            onClick={(e) => e.stopPropagation()}
            data-morph-id={morphId}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                {title && (
                  <h2
                    id="morph-modal-title"
                    className="text-xl font-semibold text-white"
                  >
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    aria-label="Close modal"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <motion.div
              className="p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: prefersReducedMotion ? 0 : 0.15,
                duration: prefersReducedMotion ? 0 : 0.2,
              }}
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default GlassMorphModal;
