import { InputHTMLAttributes, forwardRef, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  error?: string;
  label?: string;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, error, label, id, accentColor, staticColors = false, style, ...props }, ref) => {
    const glassColor = useGlassColor();
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    // Build adaptive CSS custom properties
    const adaptiveStyle: CSSProperties = staticColors ? {} : {
      '--glass-background': glassColor.glassBackground,
      '--glass-border': glassColor.glassBorder,
      '--glass-glow': glassColor.glassGlow,
      '--glass-accent-color': accentColor || glassColor.accentColor,
    } as CSSProperties;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'glass-input text-white',
            error && 'border-red-500/50 focus:border-red-500',
            className
          )}
          style={{ ...adaptiveStyle, ...style }}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
