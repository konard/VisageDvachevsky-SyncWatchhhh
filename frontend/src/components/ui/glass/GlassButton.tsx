import { ButtonHTMLAttributes, ReactNode, forwardRef, useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction } from '@/hooks';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Enable interactive glass effects (pointer tracking, ripple) */
  interactive?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({
    children,
    className,
    variant = 'default',
    size = 'md',
    fullWidth = false,
    disabled,
    interactive = false,
    onClick,
    ...props
  }, forwardedRef) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLButtonElement>) || internalRef;
    const [isRippling, setIsRippling] = useState(false);

    const { cssVars, handlers, state, isReducedMotion } = useGlassInteraction(ref, {
      enablePointerTracking: interactive && variant === 'default',
      enablePressEffect: interactive && variant === 'default',
      enableScrollResponse: false,
      enableDragEffect: false,
    });

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
      default: interactive ? 'glass-button-interactive text-white font-medium' : 'glass-button text-white font-medium',
      outline: 'glass-card border-2 border-accent-cyan/50 text-white font-medium hover:border-accent-cyan hover:shadow-glow',
      ghost: 'bg-transparent text-white hover:bg-white/10 transition-colors',
      primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white font-medium transition-colors',
      success: 'bg-green-600 hover:bg-green-700 text-white font-medium transition-colors',
      danger: 'bg-red-600 hover:bg-red-700 text-white font-medium transition-colors',
    };

    // Apply CSS custom properties to the element
    useEffect(() => {
      if (!interactive || !ref.current || isReducedMotion || variant !== 'default') return;

      Object.entries(cssVars).forEach(([key, value]) => {
        ref.current?.style.setProperty(key, value);
      });
    }, [cssVars, interactive, isReducedMotion, variant, ref]);

    // Handle ripple effect on click
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (interactive && !isReducedMotion && variant === 'default') {
        setIsRippling(true);
        setTimeout(() => setIsRippling(false), 600);
      }
      onClick?.(e);
    };

    const isInteractiveDefault = interactive && variant === 'default' && !isReducedMotion;

    return (
      <button
        ref={ref}
        className={clsx(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled}
        data-pressing={isInteractiveDefault && state.isPressing}
        data-ripple={isRippling}
        onClick={handleClick}
        {...(isInteractiveDefault ? handlers : {})}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
