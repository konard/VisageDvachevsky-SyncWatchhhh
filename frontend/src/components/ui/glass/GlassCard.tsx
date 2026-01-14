import { ReactNode, HTMLAttributes, forwardRef, useRef, useEffect, useMemo, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction } from '@/hooks';
import { useGlassEffects } from './GlassEffectsProvider';
import { useGlassColor } from '../../../contexts/GlassColorContext';

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
  /** Glass thickness affects refraction intensity */
  thickness?: 'thin' | 'medium' | 'thick';
  /** Enable refraction distortion effect */
  refraction?: boolean;
  /** Enable specular highlight effect */
  specular?: boolean;
  /** Enable chromatic aberration at edges */
  chromaticAberration?: boolean;
  /** Enable edge glow effect */
  edgeGlow?: boolean;
  /** Custom refraction intensity override (0-1) */
  refractionIntensity?: number;
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
    interactive = false,
    breathe = false,
    float = false,
    thickness = 'medium',
    refraction,
    specular,
    chromaticAberration,
    edgeGlow,
    refractionIntensity,
    tinted = false,
    glow = false,
    accentColor,
    staticColors = false,
    style,
    ...props
  }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

    // Interactive effects (pointer tracking, press)
    const { cssVars, handlers, state, isReducedMotion } = useGlassInteraction(ref, {
      enablePointerTracking: interactive,
      enablePressEffect: interactive,
      enableScrollResponse: interactive,
      enableDragEffect: false,
    });

    // Glass effects from provider (refraction, specular)
    const { lightPosition, config, isActive } = useGlassEffects();
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
    const enableChromatic = chromaticAberration ?? config.chromaticAberrationEnabled;
    const enableEdgeGlow = edgeGlow ?? config.edgeGlowEnabled;
    const shouldAnimate = isActive && !config.reduceMotion;

    // Calculate refraction intensity based on thickness
    const thicknessIntensity = {
      thin: 0.3,
      medium: 0.5,
      thick: 0.8,
    };
    const effectIntensity = refractionIntensity ?? thicknessIntensity[thickness];

    // Calculate specular highlight position based on light position
    const specularStyle = useMemo<CSSProperties>(() => {
      if (!enableSpecular || !shouldAnimate) return {};

      // Calculate gradient angle from light position
      const angle = Math.atan2(lightPosition.y - 0.5, lightPosition.x - 0.5) * (180 / Math.PI);
      const intensity = config.specularIntensity * 0.3;

      return {
        '--glass-specular-angle': `${angle}deg`,
        '--glass-specular-intensity': intensity,
        '--glass-specular-x': `${lightPosition.x * 100}%`,
        '--glass-specular-y': `${lightPosition.y * 100}%`,
      } as CSSProperties;
    }, [enableSpecular, shouldAnimate, lightPosition, config.specularIntensity]);

    // Build adaptive CSS custom properties
    const adaptiveStyle: CSSProperties = staticColors ? {} : {
      '--glass-background': glassColor.glassBackground,
      '--glass-border': glassColor.glassBorder,
      '--glass-glow': glassColor.glassGlow,
      '--glass-accent-color': accentColor || glassColor.accentColor,
    } as CSSProperties;

    // Sample local background on mount if enabled
    useEffect(() => {
      if (!staticColors && glassColor.enabled && ref.current) {
        // Optional: sample local background for per-component adaptation
        // This can be enabled for more granular color adaptation
      }
    }, [staticColors, glassColor.enabled, ref]);

    // Build effect classes
    const effectClasses = clsx(
      enableRefraction && shouldAnimate && 'glass-refraction-effect',
      enableRefraction && thickness === 'thick' && shouldAnimate && 'glass-refraction-strong',
      enableSpecular && shouldAnimate && 'glass-specular-effect',
      enableChromatic && shouldAnimate && 'glass-chromatic-effect',
      enableEdgeGlow && 'glass-edge-glow-effect'
    );

    // Apply CSS custom properties to the element for interactive effects
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
          effectClasses,
          paddingClasses[padding],
          breathe && !isReducedMotion && 'glass-breathe',
          float && !isReducedMotion && 'glass-float',
          tinted && 'glass-tinted',
          glow && 'glass-glow',
          className
        )}
        style={{
          ...adaptiveStyle,
          ...style,
          ...specularStyle,
          '--glass-refraction-intensity': effectIntensity,
        } as CSSProperties}
        data-glass-thickness={thickness}
        data-pressing={interactive && state.isPressing}
        {...(interactive && !isReducedMotion ? handlers : {})}
        {...props}
      >
        {/* Specular highlight overlay */}
        {enableSpecular && shouldAnimate && (
          <div
            className="glass-specular-overlay"
            aria-hidden="true"
            style={{
              '--specular-x': `${lightPosition.x * 100}%`,
              '--specular-y': `${lightPosition.y * 100}%`,
            } as CSSProperties}
          />
        )}

        {/* Edge highlight */}
        {enableEdgeGlow && <div className="glass-edge-highlight" aria-hidden="true" />}

        {/* Content */}
        <div className="glass-card-content relative z-10">{children}</div>
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
