import { ReactNode, HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ children, className, padding = 'md', header, footer, ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={clsx('glass-panel', className)}
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
