import { ReactNode, HTMLAttributes, forwardRef, useRef, useEffect, useMemo, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction } from '@/hooks';
import { useGlassEffects } from './GlassEffectsProvider';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  /** Enable scroll-responsive blur effect */
  interactive?: boolean;
  /** Glass thickness affects refraction intensity */
  thickness?: 'thin' | 'medium' | 'thick';
  /** Enable refraction distortion effect */
  refraction?: boolean;
  /** Enable specular highlight effect */
  specular?: boolean;
  /** Enable edge glow effect */
  edgeGlow?: boolean;
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
    interactive = false,
    thickness = 'medium',
    refraction,
    specular,
    edgeGlow,
    tinted = false,
    accentColor,
    staticColors = false,
    style,
    ...props
  }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    // Interactive effects (scroll response)
    const { cssVars, isReducedMotion } = useGlassInteraction(ref, {
      enablePointerTracking: false,
      enablePressEffect: false,
      enableScrollResponse: interactive,
      enableDragEffect: false,
    });

    // Glass effects from provider (refraction, specular)
    const { lightPosition, config, isActive, scrollProgress } = useGlassEffects();
    const glassColor = useGlassColor();

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    // Determine which effects to apply (prop overrides config)
    const enableRefraction = refraction ?? config.refractionEnabled;
    const enableSpecular = specular ?? config.specularEnabled;
    const enableEdgeGlow = edgeGlow ?? config.edgeGlowEnabled;
    const shouldAnimate = isActive && !config.reduceMotion;

    // Calculate refraction intensity based on thickness
    const thicknessIntensity = {
      thin: 0.2,
      medium: 0.4,
      thick: 0.6,
    };

    // Calculate specular highlight that responds to scroll
    const specularStyle = useMemo<CSSProperties>(() => {
      if (!enableSpecular || !shouldAnimate) return {};

      // Specular moves based on both light position and scroll
      const scrollOffset = scrollProgress * 30;
      const specularX = lightPosition.x * 100;
      const specularY = lightPosition.y * 100 - scrollOffset;
      const intensity = config.specularIntensity * 0.25;

      return {
        '--glass-specular-x': `${specularX}%`,
        '--glass-specular-y': `${Math.max(0, specularY)}%`,
        '--glass-specular-intensity': intensity,
      } as CSSProperties;
    }, [enableSpecular, shouldAnimate, lightPosition, scrollProgress, config.specularIntensity]);

    // Build adaptive CSS custom properties
    const adaptiveStyle: CSSProperties = staticColors ? {} : {
      '--glass-background': glassColor.glassBackground,
      '--glass-border': glassColor.glassBorder,
      '--glass-brightness': glassColor.brightness,
      '--glass-accent-color': accentColor || glassColor.accentColor,
    } as CSSProperties;

    // Build effect classes
    const effectClasses = clsx(
      enableRefraction && shouldAnimate && 'glass-panel-refraction',
      enableSpecular && shouldAnimate && 'glass-panel-specular',
      enableEdgeGlow && 'glass-panel-edge-glow'
    );

    // Apply CSS custom properties to the element for interactive effects
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
        className={clsx(baseClass, effectClasses, tinted && 'glass-tinted', className)}
        style={{
          ...adaptiveStyle,
          ...style,
          ...specularStyle,
          '--glass-refraction-intensity': thicknessIntensity[thickness],
        } as CSSProperties}
        data-glass-thickness={thickness}
        {...props}
      >
        {/* Specular highlight overlay for panel */}
        {enableSpecular && shouldAnimate && (
          <div
            className="glass-panel-specular-overlay"
            aria-hidden="true"
            style={{
              '--specular-x': `${lightPosition.x * 100}%`,
              '--specular-y': `${(lightPosition.y - scrollProgress * 0.3) * 100}%`,
            } as CSSProperties}
          />
        )}

        {/* Edge glow */}
        {enableEdgeGlow && <div className="glass-panel-edge-highlight" aria-hidden="true" />}

        {header && (
          <div className={clsx('border-b border-white/10 relative z-10', paddingClasses[padding])}>
            {header}
          </div>
        )}
        <div className={clsx(paddingClasses[padding], 'relative z-10')}>{children}</div>
        {footer && (
          <div className={clsx('border-t border-white/10 relative z-10', paddingClasses[padding])}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
