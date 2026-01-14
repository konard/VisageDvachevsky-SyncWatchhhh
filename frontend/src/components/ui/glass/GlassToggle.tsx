import { InputHTMLAttributes, forwardRef, CSSProperties, useMemo } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassToggle = forwardRef<HTMLInputElement, GlassToggleProps>(
  ({
    label,
    description,
    checked = false,
    onChange,
    className,
    disabled,
    accentColor,
    staticColors = false,
    ...props
  }, ref) => {
    const glassColor = useGlassColor();

    // Use accent color from context or override
    const effectiveAccentColor = accentColor || glassColor.accentColor;
    const accentGlow = glassColor.glassGlow;

    // Parse accent color for styling
    const accentStyles = useMemo(() => {
      const match = effectiveAccentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const [, r, g, b] = match;
        return {
          trackGradient: `linear-gradient(to right, rgba(${r}, ${g}, ${b}, 0.3), rgba(41, 121, 255, 0.3))`,
          thumbColor: `rgb(${r}, ${g}, ${b})`,
          borderColor: `rgba(${r}, ${g}, ${b}, 0.5)`,
        };
      }
      return {
        trackGradient: 'linear-gradient(to right, rgba(0, 229, 255, 0.3), rgba(41, 121, 255, 0.3))',
        thumbColor: '#00e5ff',
        borderColor: 'rgba(0, 229, 255, 0.5)',
      };
    }, [effectiveAccentColor]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    // Build adaptive styles
    const trackStyle: CSSProperties = checked && !staticColors ? {
      background: accentStyles.trackGradient,
      borderColor: accentStyles.borderColor,
    } : {};

    const thumbStyle: CSSProperties = checked && !staticColors ? {
      backgroundColor: accentStyles.thumbColor,
      boxShadow: `0 0 20px ${accentGlow}`,
    } : {};

    return (
      <label className={clsx('flex items-center gap-3 cursor-pointer', disabled && 'cursor-not-allowed opacity-50', className)}>
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            className={clsx(
              'w-14 h-8 rounded-full transition-all duration-300',
              checked
                ? staticColors
                  ? 'bg-gradient-to-r from-accent-cyan/30 to-accent-blue/30 border-accent-cyan/50'
                  : ''
                : 'bg-white/10 border-white/20',
              'border backdrop-blur-sm'
            )}
            style={trackStyle}
          >
            <motion.div
              className={clsx(
                'absolute top-1 w-6 h-6 rounded-full transition-all duration-300',
                checked
                  ? staticColors
                    ? 'bg-accent-cyan shadow-glow'
                    : ''
                  : 'bg-white/60'
              )}
              style={thumbStyle}
              animate={{ x: checked ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <div className="text-sm font-medium text-white">
                {label}
              </div>
            )}
            {description && (
              <div className="text-xs text-gray-400">
                {description}
              </div>
            )}
          </div>
        )}
      </label>
    );
  }
);

GlassToggle.displayName = 'GlassToggle';
