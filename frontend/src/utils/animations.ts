import { Variants } from 'framer-motion';

/**
 * Reusable animation variants for consistent motion design
 */

// Page transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const pageTransitionConfig = {
  duration: 0.3,
  ease: 'easeInOut',
};

// Fade animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Slide animations
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Scale animations
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const scaleInBig: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

// Modal animations
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

// Toast notifications
export const toastVariants: Variants = {
  initial: { opacity: 0, x: 100, scale: 0.8 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 100, scale: 0.8 },
};

// Stagger children animation
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
};

// Speaking indicator (pulse effect)
export const speakingPulse = {
  boxShadow: [
    '0 0 10px rgba(0, 229, 255, 0.3)',
    '0 0 25px rgba(0, 229, 255, 0.6)',
    '0 0 10px rgba(0, 229, 255, 0.3)',
  ],
};

export const speakingTransition = {
  duration: 1,
  repeat: Infinity,
  ease: 'easeInOut',
};

// Loading skeleton animation
export const skeletonPulse: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
  },
};

export const skeletonTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'easeInOut',
};

// Ripple effect for buttons
export const rippleVariants: Variants = {
  initial: { scale: 1, opacity: 0.5 },
  animate: { scale: 2, opacity: 0 },
};

// Hover interactions
export const hoverScale = {
  scale: 1.05,
  transition: { duration: 0.2 },
};

export const hoverGlow = {
  boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
  transition: { duration: 0.2 },
};

export const tapScale = {
  scale: 0.95,
};

// Chat message animations
export const chatMessageVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Room join animation
export const roomJoinVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, rotateY: -10 },
  animate: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  exit: { opacity: 0, scale: 0.9 },
};

/**
 * Helper function to get reduced motion variants
 * Returns empty variants if reduced motion is preferred
 */
export const getVariants = (variants: Variants, prefersReducedMotion: boolean): Variants => {
  if (prefersReducedMotion) {
    return {
      initial: {},
      animate: {},
      exit: {},
    };
  }
  return variants;
};

/**
 * Helper function to get animation config with reduced motion support
 */
export const getTransition = (
  transition: Record<string, unknown>,
  prefersReducedMotion: boolean
) => {
  if (prefersReducedMotion) {
    return { duration: 0 };
  }
  return transition;
};
