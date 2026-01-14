import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface GlassSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const GlassSpinner = ({ size = 'md', className, label, ...props }: GlassSpinnerProps) => {
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

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)} {...props}>
      <div
        className={clsx(
          'rounded-full animate-spin',
          sizeClasses[size]
        )}
        style={{
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(0, 229, 255, 0.8) 90deg,
            rgba(41, 121, 255, 0.8) 180deg,
            transparent 270deg,
            transparent 360deg
          )`,
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
