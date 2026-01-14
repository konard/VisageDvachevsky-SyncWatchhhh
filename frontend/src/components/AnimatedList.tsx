import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '../hooks';
import { staggerItem, getVariants } from '../utils/animations';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

/**
 * Animated list with stagger effect
 * Children animate in sequence with a delay between each
 */
export const AnimatedList = ({
  children,
  className = '',
  staggerDelay = 0.1,
}: AnimatedListProps) => {
  const prefersReducedMotion = useReducedMotion();

  const container = prefersReducedMotion
    ? undefined
    : {
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      };

  return (
    <motion.ul
      variants={container}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.ul>
  );
};

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Individual list item with animation
 * Use inside AnimatedList for stagger effect
 */
export const AnimatedListItem = ({ children, className = '' }: AnimatedListItemProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.li
      variants={getVariants(staggerItem, prefersReducedMotion)}
      className={className}
    >
      {children}
    </motion.li>
  );
};
