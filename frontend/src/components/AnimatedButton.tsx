import { motion } from 'framer-motion';
import { ReactNode, ComponentPropsWithoutRef } from 'react';
import { useReducedMotion } from '../hooks';
import { hoverScale, tapScale } from '../utils/animations';

type ButtonProps = ComponentPropsWithoutRef<'button'>;

interface AnimatedButtonProps
  extends Omit<
    ButtonProps,
    'onAnimationStart' | 'onAnimationEnd' | 'onDragStart' | 'onDragEnd' | 'onDrag'
  > {
  children: ReactNode;
  variant?: 'glass' | 'primary' | 'secondary';
  withRipple?: boolean;
}

/**
 * Animated button with hover and tap effects
 * Optionally includes ripple effect on click
 */
export const AnimatedButton = ({
  children,
  variant = 'glass',
  withRipple = true,
  className = '',
  ...props
}: AnimatedButtonProps) => {
  const prefersReducedMotion = useReducedMotion();

  const baseClasses = 'relative overflow-hidden transition-all duration-300';
  const variantClasses = {
    glass: 'glass-button',
    primary: 'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg',
    secondary: 'px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg',
  };

  return (
    <motion.button
      whileHover={prefersReducedMotion ? undefined : hoverScale}
      whileTap={prefersReducedMotion ? undefined : tapScale}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
      {withRipple && !prefersReducedMotion && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          initial={false}
          whileTap={{
            background: [
              'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 0%)',
              'radial-gradient(circle, rgba(255,255,255,0) 100%, transparent 100%)',
            ],
          }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.button>
  );
};
