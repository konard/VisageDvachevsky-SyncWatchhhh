import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { useReducedMotion } from './useReducedMotion';

export interface PointerPosition {
  x: number;
  y: number;
  normalizedX: number; // 0-1 relative to element
  normalizedY: number; // 0-1 relative to element
}

export interface InteractionState {
  pointerPosition: PointerPosition | null;
  isHovering: boolean;
  isPressing: boolean;
  pressDepth: number; // 0-1 scale of press depth
  scrollVelocity: number; // pixels per frame
  scrollDirection: 'up' | 'down' | null;
  dragOffset: { x: number; y: number } | null;
  isDragging: boolean;
}

export interface GlassInteractionOptions {
  enablePointerTracking?: boolean;
  enableScrollResponse?: boolean;
  enablePressEffect?: boolean;
  enableDragEffect?: boolean;
  springConfig?: {
    stiffness: number;
    damping: number;
  };
}

export interface GlassInteractionResult {
  state: InteractionState;
  cssVars: Record<string, string>;
  handlers: {
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
  isReducedMotion: boolean;
}

const defaultOptions: GlassInteractionOptions = {
  enablePointerTracking: true,
  enableScrollResponse: true,
  enablePressEffect: true,
  enableDragEffect: true,
  springConfig: {
    stiffness: 300,
    damping: 30,
  },
};

/**
 * Hook to track glass interaction states (pointer, scroll, press, drag)
 * Returns CSS custom properties for use with glass effects
 */
export function useGlassInteraction(
  ref: RefObject<HTMLElement | null>,
  options: GlassInteractionOptions = {}
): GlassInteractionResult {
  const prefersReducedMotion = useReducedMotion();
  const mergedOptions = { ...defaultOptions, ...options };

  const [state, setState] = useState<InteractionState>({
    pointerPosition: null,
    isHovering: false,
    isPressing: false,
    pressDepth: 0,
    scrollVelocity: 0,
    scrollDirection: null,
    dragOffset: null,
    isDragging: false,
  });

  // Track scroll velocity
  const scrollVelocityRef = useRef(0);
  const scrollAnimationRef = useRef<number | null>(null);

  // Track drag state
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Pointer tracking handlers
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!mergedOptions.enablePointerTracking || prefersReducedMotion) return;
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const normalizedX = x / rect.width;
      const normalizedY = y / rect.height;

      setState((prev) => ({
        ...prev,
        pointerPosition: { x, y, normalizedX, normalizedY },
        dragOffset:
          prev.isDragging && dragStartPos.current
            ? {
                x: e.clientX - dragStartPos.current.x,
                y: e.clientY - dragStartPos.current.y,
              }
            : prev.dragOffset,
      }));
    },
    [mergedOptions.enablePointerTracking, prefersReducedMotion, ref]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (!mergedOptions.enablePointerTracking || prefersReducedMotion) return;
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setState((prev) => ({
        ...prev,
        isHovering: true,
        pointerPosition: {
          x,
          y,
          normalizedX: x / rect.width,
          normalizedY: y / rect.height,
        },
      }));
    },
    [mergedOptions.enablePointerTracking, prefersReducedMotion, ref]
  );

  const handlePointerLeave = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isHovering: false,
      pointerPosition: null,
      isPressing: false,
      pressDepth: 0,
      isDragging: false,
      dragOffset: null,
    }));
    dragStartPos.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (prefersReducedMotion) return;

      setState((prev) => ({
        ...prev,
        isPressing: true,
        pressDepth: 1,
        isDragging: mergedOptions.enableDragEffect ?? false,
      }));

      if (mergedOptions.enableDragEffect) {
        dragStartPos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [mergedOptions.enableDragEffect, prefersReducedMotion]
  );

  const handlePointerUp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPressing: false,
      pressDepth: 0,
      isDragging: false,
      dragOffset: null,
    }));
    dragStartPos.current = null;
  }, []);

  // Scroll velocity tracking
  useEffect(() => {
    if (!mergedOptions.enableScrollResponse || prefersReducedMotion) return;

    let lastTime = performance.now();
    let lastScroll = window.scrollY;

    const updateScrollVelocity = () => {
      const currentTime = performance.now();
      const currentScroll = window.scrollY;
      const deltaTime = currentTime - lastTime;

      if (deltaTime > 0) {
        const velocity = (currentScroll - lastScroll) / deltaTime;
        scrollVelocityRef.current = velocity;

        setState((prev) => ({
          ...prev,
          scrollVelocity: Math.abs(velocity * 100), // Scale for visibility
          scrollDirection: velocity > 0.01 ? 'down' : velocity < -0.01 ? 'up' : prev.scrollDirection,
        }));
      }

      lastTime = currentTime;
      lastScroll = currentScroll;
      scrollAnimationRef.current = requestAnimationFrame(updateScrollVelocity);
    };

    const handleScroll = () => {
      // Decay scroll velocity over time
      const decay = () => {
        scrollVelocityRef.current *= 0.95;
        if (Math.abs(scrollVelocityRef.current) > 0.01) {
          requestAnimationFrame(decay);
        } else {
          setState((prev) => ({
            ...prev,
            scrollVelocity: 0,
            scrollDirection: null,
          }));
        }
      };

      setTimeout(decay, 100);
    };

    scrollAnimationRef.current = requestAnimationFrame(updateScrollVelocity);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mergedOptions.enableScrollResponse, prefersReducedMotion]);

  // Generate CSS custom properties based on state
  const cssVars: Record<string, string> = {};

  if (!prefersReducedMotion) {
    // Pointer position
    if (state.pointerPosition) {
      cssVars['--glass-pointer-x'] = `${state.pointerPosition.x}px`;
      cssVars['--glass-pointer-y'] = `${state.pointerPosition.y}px`;
      cssVars['--glass-pointer-normalized-x'] = `${state.pointerPosition.normalizedX}`;
      cssVars['--glass-pointer-normalized-y'] = `${state.pointerPosition.normalizedY}`;
    } else {
      cssVars['--glass-pointer-x'] = '50%';
      cssVars['--glass-pointer-y'] = '50%';
      cssVars['--glass-pointer-normalized-x'] = '0.5';
      cssVars['--glass-pointer-normalized-y'] = '0.5';
    }

    // Hover state
    cssVars['--glass-hover'] = state.isHovering ? '1' : '0';

    // Press state
    cssVars['--glass-press-depth'] = `${state.pressDepth}`;
    cssVars['--glass-pressing'] = state.isPressing ? '1' : '0';

    // Scroll state
    const scrollIntensity = Math.min(state.scrollVelocity / 10, 1);
    cssVars['--glass-scroll-velocity'] = `${state.scrollVelocity}`;
    cssVars['--glass-scroll-intensity'] = `${scrollIntensity}`;
    cssVars['--glass-scroll-blur'] = `${20 + scrollIntensity * 10}px`;

    // Drag state
    if (state.dragOffset) {
      cssVars['--glass-drag-x'] = `${state.dragOffset.x}px`;
      cssVars['--glass-drag-y'] = `${state.dragOffset.y}px`;
      const stretchFactor = Math.min(
        Math.sqrt(state.dragOffset.x ** 2 + state.dragOffset.y ** 2) / 100,
        0.1
      );
      cssVars['--glass-stretch'] = `${1 + stretchFactor}`;
    } else {
      cssVars['--glass-drag-x'] = '0px';
      cssVars['--glass-drag-y'] = '0px';
      cssVars['--glass-stretch'] = '1';
    }
  }

  return {
    state,
    cssVars,
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
    },
    isReducedMotion: prefersReducedMotion,
  };
}
