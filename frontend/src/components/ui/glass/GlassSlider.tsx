import { useState, useRef, InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

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
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const sliderRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      setInternalValue(newValue);
      onChange?.(newValue);
    };

    const percentage = ((internalValue - min) / (max - min)) * 100;

    return (
      <div className={clsx('w-full', className)}>
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
        `}</style>
      </div>
    );
  }
);

GlassSlider.displayName = 'GlassSlider';
