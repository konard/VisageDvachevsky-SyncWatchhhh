import { ButtonHTMLAttributes, ReactNode, forwardRef, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Enable adaptive accent colors */
  adaptive?: boolean;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({
    children,
    className,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    disabled,
    adaptive = false,
    accentColor,
    staticColors = false,
    style,
    ...props
  }, ref) => {
    const glassColor = useGlassColor();

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

    // Build adaptive CSS custom properties for glass variants
    const adaptiveStyle: CSSProperties = (staticColors || variant !== 'default') ? {} : {
      '--glass-border': glassColor.glassBorder,
      '--glass-glow': glassColor.glassGlow,
      '--glass-accent-color': accentColor || glassColor.accentColor,
    } as CSSProperties;

    return (
      <button
        ref={ref}
        className={clsx(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          adaptive && variant === 'default' && 'glass-adaptive',
          className
        )}
        style={{ ...adaptiveStyle, ...style }}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
