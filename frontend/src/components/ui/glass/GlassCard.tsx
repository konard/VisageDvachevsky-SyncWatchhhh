import { ReactNode, HTMLAttributes, forwardRef, useRef, useEffect, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Enable context-aware color tinting */
  tinted?: boolean;
  /** Enable accent glow effect */
  glow?: boolean;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({
    children,
    className,
    padding = 'md',
    tinted = false,
    glow = false,
    accentColor,
    staticColors = false,
    style,
    ...props
  }, ref) => {
    const glassColor = useGlassColor();
    const internalRef = useRef<HTMLDivElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    // Build adaptive CSS custom properties
    const adaptiveStyle: CSSProperties = staticColors ? {} : {
      '--glass-background': glassColor.glassBackground,
      '--glass-border': glassColor.glassBorder,
      '--glass-glow': glassColor.glassGlow,
      '--glass-accent-color': accentColor || glassColor.accentColor,
    } as CSSProperties;

    // Sample local background on mount if enabled
    useEffect(() => {
      if (!staticColors && glassColor.enabled && resolvedRef.current) {
        // Optional: sample local background for per-component adaptation
        // This can be enabled for more granular color adaptation
      }
    }, [staticColors, glassColor.enabled, resolvedRef]);

    return (
      <div
        ref={resolvedRef}
        className={clsx(
          'glass-card',
          paddingClasses[padding],
          tinted && 'glass-tinted',
          glow && 'glass-glow',
          className
        )}
        style={{ ...adaptiveStyle, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
