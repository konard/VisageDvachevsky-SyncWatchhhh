/**
 * SVG Filter Definitions for Liquid Glass Effects
 *
 * These filters create realistic glass optical effects:
 * - Refraction: Light bending through the glass surface
 * - Chromatic aberration: Color splitting at edges (like a prism)
 * - Displacement: Subtle warping of background elements
 *
 * The filters should be included once in the app and referenced by ID.
 */

import { memo } from 'react';

export interface GlassSvgFiltersProps {
  /** Base intensity for refraction effect (0-1) */
  refractionIntensity?: number;
  /** Intensity of chromatic aberration (0-1) */
  chromaticIntensity?: number;
}

export const GlassSvgFilters = memo(function GlassSvgFilters({
  refractionIntensity = 0.5,
  chromaticIntensity = 0.3,
}: GlassSvgFiltersProps) {
  // Scale values for filter parameters
  const displacementScale = Math.round(refractionIntensity * 8);
  const chromaticOffset = Math.round(chromaticIntensity * 2);

  return (
    <svg
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Noise texture for subtle refraction distortion */}
        <filter id="glass-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015"
            numOctaves="3"
            result="noise"
            seed="42"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={displacementScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Subtle refraction effect - displaces background slightly */}
        <filter id="glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.02 0.015"
            numOctaves="2"
            result="turbulence"
            seed="100"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale={displacementScale}
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>

        {/* Strong refraction for thicker glass */}
        <filter id="glass-refraction-strong" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.03 0.02"
            numOctaves="3"
            result="turbulence"
            seed="150"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale={displacementScale * 2}
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>

        {/* Chromatic aberration - color splitting at edges */}
        <filter id="glass-chromatic" x="-5%" y="-5%" width="110%" height="110%">
          {/* Red channel - shifted right */}
          <feOffset in="SourceGraphic" dx={chromaticOffset} dy="0" result="red" />
          <feColorMatrix
            in="red"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="redChannel"
          />

          {/* Green channel - no shift */}
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="greenChannel"
          />

          {/* Blue channel - shifted left */}
          <feOffset in="SourceGraphic" dx={-chromaticOffset} dy="0" result="blue" />
          <feColorMatrix
            in="blue"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="blueChannel"
          />

          {/* Composite all channels */}
          <feBlend in="redChannel" in2="greenChannel" mode="screen" result="rg" />
          <feBlend in="rg" in2="blueChannel" mode="screen" />
        </filter>

        {/* Subtle edge glow effect */}
        <filter id="glass-edge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0  0.9 0 0 0 0.9  0 0 0 0 1  0 0 0 0.3 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Combined glass effect (refraction + subtle chromatic) */}
        <filter id="glass-optical" x="-15%" y="-15%" width="130%" height="130%">
          {/* First apply subtle turbulence */}
          <feTurbulence
            type="turbulence"
            baseFrequency="0.02"
            numOctaves="2"
            result="turbulence"
            seed="200"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale={displacementScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />

          {/* Then add very subtle chromatic split */}
          <feOffset in="displaced" dx="0.5" dy="0" result="redShift" />
          <feColorMatrix
            in="redShift"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          <feColorMatrix
            in="displaced"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="green"
          />
          <feOffset in="displaced" dx="-0.5" dy="0" result="blueShift" />
          <feColorMatrix
            in="blueShift"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="blue"
          />
          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" />
        </filter>

        {/* Specular highlight gradient */}
        <linearGradient id="glass-specular-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
          <stop offset="50%" stopColor="rgba(255, 255, 255, 0)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.1)" />
        </linearGradient>

        {/* Edge highlight gradient */}
        <linearGradient id="glass-edge-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)" />
          <stop offset="10%" stopColor="rgba(255, 255, 255, 0)" />
          <stop offset="90%" stopColor="rgba(255, 255, 255, 0)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.1)" />
        </linearGradient>

        {/* Radial specular highlight */}
        <radialGradient id="glass-specular-radial" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>

        {/* Cyan accent glow for brand styling */}
        <radialGradient id="glass-cyan-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0, 229, 255, 0.15)" />
          <stop offset="100%" stopColor="rgba(0, 229, 255, 0)" />
        </radialGradient>
      </defs>
    </svg>
  );
});

GlassSvgFilters.displayName = 'GlassSvgFilters';
