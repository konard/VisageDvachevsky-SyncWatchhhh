import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export interface GlassToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const GlassToggle = forwardRef<HTMLInputElement, GlassToggleProps>(
  ({ label, description, checked = false, onChange, className, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

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
                ? 'bg-gradient-to-r from-accent-cyan/30 to-accent-blue/30 border-accent-cyan/50'
                : 'bg-white/10 border-white/20',
              'border backdrop-blur-sm'
            )}
          >
            <motion.div
              className={clsx(
                'absolute top-1 w-6 h-6 rounded-full transition-all duration-300',
                checked
                  ? 'bg-accent-cyan shadow-glow'
                  : 'bg-white/60'
              )}
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
