import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '../hooks';
import { pageTransition, pageTransitionConfig, getVariants, getTransition } from '../utils/animations';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for page transitions
 * Automatically animates pages on route changes
 */
export const AnimatedPage = ({ children, className = '' }: AnimatedPageProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={getVariants(pageTransition, prefersReducedMotion)}
      transition={getTransition(pageTransitionConfig, prefersReducedMotion)}
      className={className}
    >
      {children}
    </motion.div>
  );
};
