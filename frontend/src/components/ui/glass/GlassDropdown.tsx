import { ReactNode, useState, useRef, useEffect, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlassColor } from '../../../contexts/GlassColorContext';

export interface GlassDropdownOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface GlassDropdownProps {
  options: GlassDropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  /** Override accent color */
  accentColor?: string;
  /** Disable all adaptive color features */
  staticColors?: boolean;
}

export const GlassDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  disabled = false,
  label,
  accentColor,
  staticColors = false,
}: GlassDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const glassColor = useGlassColor();

  const selectedOption = options.find(opt => opt.value === value);

  // Build adaptive CSS custom properties
  const adaptiveStyle: CSSProperties = staticColors ? {} : {
    '--glass-background': glassColor.glassBackground,
    '--glass-border': glassColor.glassBorder,
    '--glass-glow': glassColor.glassGlow,
    '--glass-accent-color': accentColor || glassColor.accentColor,
  } as CSSProperties;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'glass-input flex items-center justify-between',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={adaptiveStyle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={clsx('flex items-center gap-2', !selectedOption && 'text-gray-400')}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={clsx(
            'w-5 h-5 transition-transform text-gray-400',
            isOpen && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 glass-card p-2 max-h-60 overflow-y-auto"
            style={adaptiveStyle}
            role="listbox"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => !option.disabled && handleSelect(option.value)}
                disabled={option.disabled}
                className={clsx(
                  'w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-all text-left',
                  option.value === value
                    ? 'bg-accent-cyan/20 text-accent-cyan'
                    : 'text-white hover:bg-white/10',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                role="option"
                aria-selected={option.value === value}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
