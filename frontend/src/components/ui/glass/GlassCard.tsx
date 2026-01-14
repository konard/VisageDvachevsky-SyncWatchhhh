import { ReactNode, HTMLAttributes, forwardRef, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction } from '@/hooks';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Enable interactive glass effects (pointer tracking, press depth) */
  interactive?: boolean;
  /** Enable subtle breathing animation when idle */
  breathe?: boolean;
  /** Enable floating animation */
  float?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({
    children,
    className,
    padding = 'md',
    interactive = false,
    breathe = false,
    float = false,
    ...props
  }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    const { cssVars, handlers, state, isReducedMotion } = useGlassInteraction(ref, {
      enablePointerTracking: interactive,
      enablePressEffect: interactive,
      enableScrollResponse: interactive,
      enableDragEffect: false,
    });

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    // Apply CSS custom properties to the element
    useEffect(() => {
      if (!interactive || !ref.current || isReducedMotion) return;

      Object.entries(cssVars).forEach(([key, value]) => {
        ref.current?.style.setProperty(key, value);
      });
    }, [cssVars, interactive, isReducedMotion, ref]);

    const baseClass = interactive ? 'glass-card-interactive' : 'glass-card';

    return (
      <div
        ref={ref}
        className={clsx(
          baseClass,
          paddingClasses[padding],
          breathe && !isReducedMotion && 'glass-breathe',
          float && !isReducedMotion && 'glass-float',
          className
        )}
        data-pressing={interactive && state.isPressing}
        {...(interactive && !isReducedMotion ? handlers : {})}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
