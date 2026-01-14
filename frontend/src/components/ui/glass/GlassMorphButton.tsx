import { ReactNode, forwardRef, useCallback, useRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useMorphTransition } from '../../../hooks/useMorphTransition';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { smoothSpring, hoverScale, tapScale } from '../../../utils/animations';

export interface GlassMorphButtonProps {
  /**
   * Unique morph identifier - use this to connect button to a modal
   */
  morphId: string;
  /**
   * Button content
   */
  children: ReactNode;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary' | 'success' | 'danger';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether button takes full width
   */
  fullWidth?: boolean;
  /**
   * Whether button is disabled
   */
  disabled?: boolean;
  /**
   * Button type
   */
  type?: 'button' | 'submit' | 'reset';
  /**
   * Whether to hide button when modal is open (for seamless morph)
   */
  hideWhenMorphing?: boolean;
  /**
   * Click handler
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Callback when morph starts
   */
  onMorphStart?: () => void;
  /**
   * ARIA label
   */
  'aria-label'?: string;
  /**
   * ARIA labelledby
   */
  'aria-labelledby'?: string;
  /**
   * ARIA describedby
   */
  'aria-describedby'?: string;
  /**
   * Tab index
   */
  tabIndex?: number;
}

export interface GlassMorphButtonRef {
  element: HTMLButtonElement | null;
  morphTo: (targetId: string) => void;
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const variantClasses = {
  default: 'glass-button text-white font-medium',
  outline: 'glass-card border-2 border-accent-cyan/50 text-white font-medium hover:border-accent-cyan hover:shadow-glow',
  ghost: 'bg-transparent text-white hover:bg-white/10 transition-colors',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white font-medium transition-colors',
  success: 'bg-green-600 hover:bg-green-700 text-white font-medium transition-colors',
  danger: 'bg-red-600 hover:bg-red-700 text-white font-medium transition-colors',
};

/**
 * GlassMorphButton - Button that can morph into modals
 *
 * This button registers itself as a morph source element.
 * When paired with a GlassMorphModal with matching morphId,
 * it creates a seamless liquid-glass transition effect.
 *
 * Usage:
 * ```tsx
 * // Button registers as morph source
 * <GlassMorphButton
 *   morphId="create-room"
 *   onClick={() => setIsOpen(true)}
 *   hideWhenMorphing
 * >
 *   Create Room
 * </GlassMorphButton>
 *
 * // Modal morphs from the button
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
export const GlassMorphButton = forwardRef<GlassMorphButtonRef, GlassMorphButtonProps>(
  (
    {
      morphId,
      children,
      className,
      variant = 'default',
      size = 'md',
      fullWidth = false,
      disabled,
      type = 'button',
      hideWhenMorphing = false,
      onClick,
      onMorphStart,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      tabIndex,
    },
    forwardedRef
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const { ref, isMorphing, morphTo } = useMorphTransition<HTMLButtonElement>({
      morphId,
      isActive: true,
      onMorphStart,
    });

    // Combine refs
    useImperativeHandle(forwardedRef, () => ({
      element: buttonRef.current,
      morphTo,
    }), [morphTo]);

    // Sync refs
    const setRefs = useCallback((el: HTMLButtonElement | null) => {
      (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    }, [ref]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        onClick(e);
      }
    }, [onClick]);

    // Determine visibility
    const shouldHide = hideWhenMorphing && isMorphing;

    return (
      <AnimatePresence mode="wait">
        {!shouldHide && (
          <motion.button
            ref={setRefs}
            type={type}
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
            transition={smoothSpring}
            whileHover={prefersReducedMotion ? undefined : hoverScale}
            whileTap={prefersReducedMotion ? undefined : tapScale}
            onClick={handleClick}
            disabled={disabled}
            className={clsx(
              'glass-morph-source',
              variantClasses[variant],
              sizeClasses[size],
              fullWidth && 'w-full',
              disabled && 'opacity-50 cursor-not-allowed',
              isMorphing && 'morph-animating',
              className
            )}
            data-morph-id={morphId}
            data-morphing={isMorphing || undefined}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-describedby={ariaDescribedby}
            tabIndex={tabIndex}
          >
            {children}
          </motion.button>
        )}
      </AnimatePresence>
    );
  }
);

GlassMorphButton.displayName = 'GlassMorphButton';

export default GlassMorphButton;
