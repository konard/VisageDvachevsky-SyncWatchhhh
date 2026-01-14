import { ReactNode, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useMorphTransition } from '../../../hooks/useMorphTransition';
import { smoothSpring } from '../../../utils/animations';

export interface MorphTargetProps {
  /**
   * Unique identifier for morph transitions
   */
  morphId: string;
  /**
   * Content to render
   */
  children: ReactNode;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Whether the element is visible (for AnimatePresence)
   */
  isVisible?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Callback when morph starts
   */
  onMorphStart?: () => void;
  /**
   * Callback when morph completes
   */
  onMorphComplete?: () => void;
  /**
   * Whether to use glass styling
   */
  glass?: boolean;
  /**
   * ARIA role
   */
  role?: string;
  /**
   * Additional styles
   */
  style?: React.CSSProperties;
}

export interface MorphTargetRef {
  morphTo: (targetId: string) => void;
  element: HTMLElement | null;
}

/**
 * MorphTarget - A wrapper component that can participate in morph transitions
 *
 * Use this to wrap elements that should morph into other elements.
 * Elements with the same morphId or connected via morphTo() will
 * smoothly transition between each other.
 */
export const MorphTarget = forwardRef<MorphTargetRef, MorphTargetProps>(
  (
    {
      morphId,
      children,
      className,
      isVisible = true,
      onClick,
      onMorphStart,
      onMorphComplete,
      glass = false,
      role,
      style,
    },
    forwardedRef
  ) => {
    const {
      ref,
      isMorphing,
      isTarget,
      morphStyle,
      morphTo,
      prefersReducedMotion,
    } = useMorphTransition<HTMLDivElement>({
      morphId,
      isActive: isVisible,
      onMorphStart,
      onMorphComplete,
    });

    // Expose morphTo method via ref
    useImperativeHandle(forwardedRef, () => ({
      morphTo,
      element: ref.current,
    }), [morphTo, ref]);

    // Animation variants
    const getInitialState = () => {
      if (prefersReducedMotion) {
        return { opacity: 1 };
      }
      if (isTarget) {
        return {
          opacity: 0,
          scale: 0.5,
        };
      }
      return { opacity: 0, scale: 0.95 };
    };

    const animateState = {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
    };

    const getExitState = () => {
      if (prefersReducedMotion) {
        return { opacity: 0 };
      }
      return { opacity: 0, scale: 0.95 };
    };

    return (
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            ref={ref}
            initial={getInitialState()}
            animate={animateState}
            exit={getExitState()}
            transition={prefersReducedMotion ? { duration: 0 } : smoothSpring}
            onClick={onClick}
            className={clsx(
              glass && 'glass-card',
              isMorphing && 'morph-animating',
              className
            )}
            style={{
              ...morphStyle,
              ...style,
            }}
            role={role}
            data-morph-id={morphId}
            data-morphing={isMorphing || undefined}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

MorphTarget.displayName = 'MorphTarget';

export default MorphTarget;
