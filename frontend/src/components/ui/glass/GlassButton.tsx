import { ButtonHTMLAttributes, ReactNode, forwardRef, useRef, useEffect, useState, useMemo, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction } from '@/hooks';
import { useGlassEffects } from './GlassEffectsProvider';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Enable interactive glass effects (pointer tracking, ripple) */
  interactive?: boolean;
  /** Enable refraction distortion effect on hover */
  refraction?: boolean;
  /** Enable specular highlight effect */
  specular?: boolean;
  /** Enable edge glow effect */
  edgeGlow?: boolean;
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
    refraction,
    specular,
    edgeGlow,
    onClick,
    style,
    ...props
  }, forwardedRef) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLButtonElement>) || internalRef;
    const [isRippling, setIsRippling] = useState(false);

    // Interactive effects (pointer tracking, press)
    const { cssVars, handlers, state, isReducedMotion } = useGlassInteraction(ref, {
      enablePointerTracking: interactive && variant === 'default',
      enablePressEffect: interactive && variant === 'default',
      enableScrollResponse: false,
      enableDragEffect: false,
    });

    // Glass effects from provider (refraction, specular)
    const { lightPosition, config, isActive } = useGlassEffects();

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
      default: interactive ? 'glass-button-interactive text-white font-medium' : 'glass-button text-white font-medium',
      outline:
        'glass-card border-2 border-accent-cyan/50 text-white font-medium hover:border-accent-cyan hover:shadow-glow',
      ghost: 'bg-transparent text-white hover:bg-white/10 transition-colors',
      primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white font-medium transition-colors',
      success: 'bg-green-600 hover:bg-green-700 text-white font-medium transition-colors',
      danger: 'bg-red-600 hover:bg-red-700 text-white font-medium transition-colors',
    };

    // Determine which effects to apply (prop overrides config)
    // For buttons, effects are more subtle by default
    const enableRefraction = refraction ?? (variant === 'default' && config.refractionEnabled);
    const enableSpecular = specular ?? (variant === 'default' && config.specularEnabled);
    const enableEdgeGlow = edgeGlow ?? (variant === 'default' && config.edgeGlowEnabled);
    const shouldAnimate = isActive && !config.reduceMotion && !disabled;

    // Calculate specular highlight position for button
    const specularStyle = useMemo<CSSProperties>(() => {
      if (!enableSpecular || !shouldAnimate) return {};

      const intensity = config.specularIntensity * 0.2;
      return {
        '--glass-specular-x': `${lightPosition.x * 100}%`,
        '--glass-specular-y': `${lightPosition.y * 100}%`,
        '--glass-specular-intensity': intensity,
      } as CSSProperties;
    }, [enableSpecular, shouldAnimate, lightPosition, config.specularIntensity]);

    // Build effect classes
    const effectClasses = clsx(
      enableRefraction && shouldAnimate && 'glass-button-refraction',
      enableSpecular && shouldAnimate && 'glass-button-specular',
      enableEdgeGlow && 'glass-button-edge-glow'
    );

    // Apply CSS custom properties to the element for interactive effects
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
          effectClasses,
          sizeClasses[size],
          fullWidth && 'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        style={{
          ...style,
          ...specularStyle,
        }}
        disabled={disabled}
        data-pressing={isInteractiveDefault && state.isPressing}
        data-ripple={isRippling}
        onClick={handleClick}
        {...(isInteractiveDefault ? handlers : {})}
        {...props}
      >
        {/* Specular highlight overlay for glass buttons */}
        {enableSpecular && shouldAnimate && variant === 'default' && (
          <span
            className="glass-button-specular-overlay"
            aria-hidden="true"
            style={{
              '--specular-x': `${lightPosition.x * 100}%`,
              '--specular-y': `${lightPosition.y * 100}%`,
            } as CSSProperties}
          />
        )}

        {/* Edge glow for glass buttons */}
        {enableEdgeGlow && variant === 'default' && (
          <span className="glass-button-edge-highlight" aria-hidden="true" />
        )}

        {/* Content */}
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
