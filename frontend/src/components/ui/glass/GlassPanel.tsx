import { ReactNode, HTMLAttributes, forwardRef, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction } from '@/hooks';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  /** Enable scroll-responsive blur effect */
  interactive?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({
    children,
    className,
    padding = 'md',
    header,
    footer,
    interactive = false,
    ...props
  }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    const { cssVars, isReducedMotion } = useGlassInteraction(ref, {
      enablePointerTracking: false,
      enablePressEffect: false,
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

    const baseClass = interactive && !isReducedMotion ? 'glass-panel-interactive' : 'glass-panel';

    return (
      <div
        ref={ref}
        className={clsx(baseClass, className)}
        {...props}
      >
        {header && (
          <div className={clsx('border-b border-white/10', paddingClasses[padding])}>
            {header}
          </div>
        )}
        <div className={clsx(paddingClasses[padding])}>
          {children}
        </div>
        {footer && (
          <div className={clsx('border-t border-white/10', paddingClasses[padding])}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
