import { useState, useRef, InputHTMLAttributes, forwardRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useGlassInteraction, useReducedMotion } from '@/hooks';

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
            <span className="text-sm text-accent-cyan font-medium">
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
            className="slider-input w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right,
                rgba(0, 229, 255, 0.5) 0%,
                rgba(0, 229, 255, 0.5) ${percentage}%,
                rgba(255, 255, 255, 0.1) ${percentage}%,
                rgba(255, 255, 255, 0.1) 100%)`
            }}
            {...props}
          />
        </div>
        <style>{`
          .slider-input::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(0, 229, 255, 0.8), rgba(41, 121, 255, 0.8));
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
            transition: all 0.2s ease;
          }

          .slider-input::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 0 20px rgba(0, 229, 255, 0.7);
          }

          .slider-input::-webkit-slider-thumb:active {
            transform: scale(1.05);
          }

          .slider-input::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(0, 229, 255, 0.8), rgba(41, 121, 255, 0.8));
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
            transition: all 0.2s ease;
          }

          .slider-input::-moz-range-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 0 20px rgba(0, 229, 255, 0.7);
          }

          .slider-input:focus {
            outline: none;
          }

          .slider-input:focus::-webkit-slider-thumb {
            box-shadow: 0 0 20px rgba(0, 229, 255, 0.8);
          }

          .slider-input:focus::-moz-range-thumb {
            box-shadow: 0 0 20px rgba(0, 229, 255, 0.8);
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
