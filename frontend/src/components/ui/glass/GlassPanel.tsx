import { ReactNode, HTMLAttributes, forwardRef, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  /** Enable context-aware color tinting */
  tinted?: boolean;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({
    children,
    className,
    padding = 'md',
    header,
    footer,
    tinted = false,
    accentColor,
    staticColors = false,
    style,
    ...props
  }, ref) => {
    const glassColor = useGlassColor();

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
      '--glass-brightness': glassColor.brightness,
      '--glass-accent-color': accentColor || glassColor.accentColor,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={clsx('glass-panel', tinted && 'glass-tinted', className)}
        style={{ ...adaptiveStyle, ...style }}
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
