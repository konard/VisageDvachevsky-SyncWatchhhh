import { useState, useRef, InputHTMLAttributes, forwardRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction, useReducedMotion } from '@/hooks';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  showValue?: boolean;
  className?: string;
  formatValue?: (value: number) => string;
  /** Enable interactive glass effects (stretch on drag) */
  interactive?: boolean;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassSlider = forwardRef<HTMLInputElement, GlassSliderProps>(
  ({
    label,
    min = 0,
    max = 100,
    step = 1,
    value = 50,
    onChange,
    showValue = true,
    className,
    formatValue = (val) => val.toString(),
    interactive = false,
    accentColor,
    staticColors = false,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLInputElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const { isReducedMotion } = useGlassInteraction(containerRef, {
      enablePointerTracking: false,
      enablePressEffect: false,
      enableScrollResponse: false,
      enableDragEffect: interactive,
    });

    const glassColor = useGlassColor();

    // Use accent color from context or override
    const effectiveAccentColor = accentColor || glassColor.accentColor;
    const accentGlow = glassColor.glassGlow;

    // Apply CSS custom properties for stretch effect
    useEffect(() => {
      if (!interactive || !containerRef.current || isReducedMotion) return;

      // Calculate stretch based on drag direction
      if (isDragging) {
        containerRef.current.style.setProperty('--glass-stretch', '1.02');
      } else {
        containerRef.current.style.setProperty('--glass-stretch', '1');
      }
    }, [isDragging, interactive, isReducedMotion]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      setInternalValue(newValue);
      onChange?.(newValue);
    };

    const handlePointerDown = () => {
      if (!prefersReducedMotion && interactive) {
        setIsDragging(true);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    useEffect(() => {
      // Add global pointer up listener to handle dragging outside the slider
      if (isDragging) {
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
      }
    }, [isDragging]);

    const percentage = ((internalValue - min) / (max - min)) * 100;

    const isInteractive = interactive && !prefersReducedMotion;

    // Generate unique ID for scoped styles
    const sliderId = useMemo(() => `slider-${Math.random().toString(36).substr(2, 9)}`, []);

    // Parse accent color for RGB values
    const accentRgb = useMemo(() => {
      const match = effectiveAccentColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return `${match[1]}, ${match[2]}, ${match[3]}`;
      }
      // Default cyan if parsing fails
      return '0, 229, 255';
    }, [effectiveAccentColor]);

    return (
      <div
        ref={containerRef}
        className={clsx(
          'w-full',
          isInteractive && 'glass-slider-interactive',
          className
        )}
        data-dragging={isDragging}
      >
        <div className="flex items-center justify-between mb-2">
          {label && (
            <label className="text-sm font-medium text-gray-300">
              {label}
            </label>
          )}
          {showValue && (
            <span
              className="text-sm font-medium"
              style={{ color: staticColors ? '#00e5ff' : effectiveAccentColor }}
            >
              {formatValue(internalValue)}
            </span>
          )}
        </div>
        <div className="relative">
          <input
            ref={ref || sliderRef}
            type="range"
            min={min}
            max={max}
            step={step}
            value={internalValue}
            onChange={handleChange}
            onPointerDown={handlePointerDown}
            className={`${sliderId} w-full h-2 rounded-full appearance-none cursor-pointer`}
            style={{
              background: `linear-gradient(to right,
                rgba(${accentRgb}, 0.5) 0%,
                rgba(${accentRgb}, 0.5) ${percentage}%,
                rgba(255, 255, 255, 0.1) ${percentage}%,
                rgba(255, 255, 255, 0.1) 100%)`
            }}
            {...props}
          />
        </div>
        <style>{`
          .${sliderId}::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(${accentRgb}, 0.8), rgba(41, 121, 255, 0.8));
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            box-shadow: 0 0 10px ${staticColors ? 'rgba(0, 229, 255, 0.5)' : accentGlow};
            transition: all 0.2s ease;
          }

          .${sliderId}::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 0 20px ${staticColors ? 'rgba(0, 229, 255, 0.7)' : accentGlow};
          }

          .${sliderId}::-webkit-slider-thumb:active {
            transform: scale(1.05);
          }

          .${sliderId}::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(${accentRgb}, 0.8), rgba(41, 121, 255, 0.8));
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            box-shadow: 0 0 10px ${staticColors ? 'rgba(0, 229, 255, 0.5)' : accentGlow};
            transition: all 0.2s ease;
          }

          .${sliderId}::-moz-range-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 0 20px ${staticColors ? 'rgba(0, 229, 255, 0.7)' : accentGlow};
          }

          .${sliderId}:focus {
            outline: none;
          }

          .${sliderId}:focus::-webkit-slider-thumb {
            box-shadow: 0 0 20px ${staticColors ? 'rgba(0, 229, 255, 0.8)' : accentGlow};
          }

          .${sliderId}:focus::-moz-range-thumb {
            box-shadow: 0 0 20px ${staticColors ? 'rgba(0, 229, 255, 0.8)' : accentGlow};
          }

          @media (prefers-reduced-motion: reduce) {
            .slider-input::-webkit-slider-thumb,
            .slider-input::-moz-range-thumb {
              transition: none;
            }

            .slider-input::-webkit-slider-thumb:hover,
            .slider-input::-webkit-slider-thumb:active,
            .slider-input::-moz-range-thumb:hover {
              transform: none;
            }
          }
        `}</style>
      </div>
    );
  }
);

GlassSlider.displayName = 'GlassSlider';
