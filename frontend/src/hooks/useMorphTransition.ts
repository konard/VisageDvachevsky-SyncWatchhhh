import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useMorphTransitionContextOptional, MorphRect } from '../contexts/MorphTransitionContext';
import { useReducedMotion } from './useReducedMotion';

export interface UseMorphTransitionOptions {
  /**
   * Unique identifier for this morph element
   */
  morphId: string;
  /**
   * Whether this element is currently visible/active
   */
  isActive?: boolean;
  /**
   * Callback when morph animation starts
   */
  onMorphStart?: () => void;
  /**
   * Callback when morph animation completes
   */
  onMorphComplete?: () => void;
}

export interface UseMorphTransitionResult<T extends HTMLElement> {
  /**
   * Ref to attach to the morph element
   */
  ref: React.RefObject<T>;
  /**
   * Whether this element is currently morphing
   */
  isMorphing: boolean;
  /**
   * Whether this is the source of an active morph
   */
  isSource: boolean;
  /**
   * Whether this is the target of an active morph
   */
  isTarget: boolean;
  /**
   * Source rect for animation calculations
   */
  sourceRect: MorphRect | null;
  /**
   * Start morph to target element
   */
  morphTo: (targetId: string) => void;
  /**
   * Animation styles for FLIP animation
   */
  morphStyle: React.CSSProperties;
  /**
   * Whether reduced motion is preferred
   */
  prefersReducedMotion: boolean;
}

/**
 * Hook for participating in morph transitions
 *
 * Enables smooth FLIP animations between elements with the same morphId
 * or between different elements using morphTo().
 */
export function useMorphTransition<T extends HTMLElement = HTMLDivElement>(
  options: UseMorphTransitionOptions
): UseMorphTransitionResult<T> {
  const { morphId, isActive = true, onMorphStart, onMorphComplete } = options;
  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();
  const context = useMorphTransitionContextOptional();

  // Register element with context
  useEffect(() => {
    if (context && isActive) {
      context.register(morphId, ref as React.RefObject<HTMLElement>);
      return () => {
        context.unregister(morphId);
      };
    }
  }, [context, morphId, isActive]);

  // Check morph state
  const isMorphing = context?.isMorphing(morphId) ?? false;
  const activeMorph = context?.activeMorph;
  const isSource = activeMorph?.sourceId === morphId;
  const isTarget = activeMorph?.targetId === morphId;
  const sourceRect = context?.getSourceRect() ?? null;

  // Handle morph lifecycle callbacks
  useEffect(() => {
    if (isMorphing && activeMorph?.isAnimating) {
      onMorphStart?.();
    }
  }, [isMorphing, activeMorph?.isAnimating, onMorphStart]);

  useEffect(() => {
    if (activeMorph && !activeMorph.isAnimating && activeMorph.progress === 1) {
      onMorphComplete?.();
    }
  }, [activeMorph, onMorphComplete]);

  // Start morph to target
  const morphTo = useCallback((targetId: string) => {
    if (context && !prefersReducedMotion) {
      context.startMorph(morphId, targetId);
    }
  }, [context, morphId, prefersReducedMotion]);

  // Calculate FLIP animation styles for target element
  const morphStyle = useMemo((): React.CSSProperties => {
    if (!isTarget || !sourceRect || !ref.current || prefersReducedMotion) {
      return {};
    }

    // Target needs inverse transform to animate FROM source position
    const targetRect = ref.current.getBoundingClientRect();

    // Calculate delta
    const deltaX = sourceRect.x - targetRect.left;
    const deltaY = sourceRect.y - targetRect.top;
    const scaleX = sourceRect.width / targetRect.width;
    const scaleY = sourceRect.height / targetRect.height;

    // Return transform for initial state (will animate to identity)
    if (activeMorph?.isAnimating) {
      return {
        '--morph-delta-x': `${deltaX}px`,
        '--morph-delta-y': `${deltaY}px`,
        '--morph-scale-x': scaleX,
        '--morph-scale-y': scaleY,
        '--morph-source-radius': `${sourceRect.borderRadius}px`,
      } as React.CSSProperties;
    }

    return {};
  }, [isTarget, sourceRect, activeMorph?.isAnimating, prefersReducedMotion]);

  return {
    ref,
    isMorphing,
    isSource,
    isTarget,
    sourceRect,
    morphTo,
    morphStyle,
    prefersReducedMotion,
  };
}

export default useMorphTransition;
