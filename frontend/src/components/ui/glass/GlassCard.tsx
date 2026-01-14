import { ReactNode, HTMLAttributes, forwardRef, useMemo, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassEffects } from './GlassEffectsProvider';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
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
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      className,
      padding = 'md',
      thickness = 'medium',
      refraction,
      specular,
      chromaticAberration,
      edgeGlow,
      refractionIntensity,
      style,
      ...props
    },
    ref
  ) => {
    const { lightPosition, config, isActive } = useGlassEffects();

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

    // Build effect classes
    const effectClasses = clsx(
      enableRefraction && shouldAnimate && 'glass-refraction-effect',
      enableRefraction && thickness === 'thick' && shouldAnimate && 'glass-refraction-strong',
      enableSpecular && shouldAnimate && 'glass-specular-effect',
      enableChromatic && shouldAnimate && 'glass-chromatic-effect',
      enableEdgeGlow && 'glass-edge-glow-effect'
    );

    return (
      <div
        ref={ref}
        className={clsx('glass-card', effectClasses, paddingClasses[padding], className)}
        style={{
          ...style,
          ...specularStyle,
          '--glass-refraction-intensity': effectIntensity,
        } as CSSProperties}
        data-glass-thickness={thickness}
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
