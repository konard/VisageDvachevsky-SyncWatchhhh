import { HTMLAttributes, useMemo } from 'react';
import { clsx } from 'clsx';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassSpinner = ({
  size = 'md',
  className,
  label,
  accentColor,
  staticColors = false,
  ...props
}: GlassSpinnerProps) => {
  const glassColor = useGlassColor();

  // Use accent color from context or override
  const effectiveAccentColor = accentColor || glassColor.accentColor;

  // Parse accent color for conic gradient
  const accentRgb = useMemo(() => {
    const match = effectiveAccentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `${match[1]}, ${match[2]}, ${match[3]}`;
    }
    // Default cyan if parsing fails
    return '0, 229, 255';
  }, [effectiveAccentColor]);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const borderSize = {
    sm: '2px',
    md: '3px',
    lg: '4px',
    xl: '5px',
  };

  const spinnerGradient = staticColors
    ? `conic-gradient(
        from 0deg,
        transparent 0deg,
        rgba(0, 229, 255, 0.8) 90deg,
        rgba(41, 121, 255, 0.8) 180deg,
        transparent 270deg,
        transparent 360deg
      )`
    : `conic-gradient(
        from 0deg,
        transparent 0deg,
        rgba(${accentRgb}, 0.8) 90deg,
        rgba(41, 121, 255, 0.8) 180deg,
        transparent 270deg,
        transparent 360deg
      )`;

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)} {...props}>
      <div
        className={clsx(
          'rounded-full animate-spin',
          sizeClasses[size]
        )}
        style={{
          background: spinnerGradient,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${borderSize[size]}), white calc(100% - ${borderSize[size]} + 1px))`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${borderSize[size]}), white calc(100% - ${borderSize[size]} + 1px))`,
        }}
        role="status"
        aria-label={label || 'Loading'}
      >
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
      {label && (
        <p className="text-sm text-gray-300">{label}</p>
      )}
    </div>
  );
};
