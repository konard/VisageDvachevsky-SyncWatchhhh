import { Variants } from 'framer-motion';

/**
 * Reusable animation variants for consistent motion design
 * Inspired by Apple's liquid-glass design with smooth, spring-based animations
 */

// Spring configurations for smooth, natural motion (Apple-style)
export const springConfig = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 20,
};

export const smoothSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export const softSpring = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
};

// Page transitions with smooth spring animation
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
};

export const pageTransitionConfig = smoothSpring;

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

// Modal animations with smooth backdrop and spring content
export const modalBackdrop: Variants = {
  initial: { opacity: 0, backdropFilter: 'blur(0px)' },
  animate: { opacity: 1, backdropFilter: 'blur(8px)' },
  exit: { opacity: 0, backdropFilter: 'blur(0px)' },
};

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 30 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 30 },
};

export const modalContentTransition = smoothSpring;

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

// Hover interactions with smooth spring feedback (Apple-style micro-interactions)
export const hoverScale = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

export const hoverLift = {
  y: -2,
  scale: 1.01,
  boxShadow: '0 12px 48px 0 rgba(31, 38, 135, 0.5)',
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

export const hoverGlow = {
  boxShadow: '0 0 30px rgba(0, 229, 255, 0.5)',
  transition: { duration: 0.3, ease: 'easeOut' },
};

export const tapScale = {
  scale: 0.97,
  transition: { duration: 0.1 },
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

// ============================================================================
// Liquid Glass Morph Transitions
// ============================================================================

/**
 * Spring config optimized for liquid-glass morphing
 * Creates smooth, fluid motion that feels natural
 */
export const morphSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 35,
  mass: 1,
};

/**
 * Morph transition for modal expansion from button
 * Implements FLIP animation technique
 */
export const morphExpandVariants: Variants = {
  initial: {
    opacity: 0.5,
    scale: 0.3,
    borderRadius: 12,
  },
  animate: {
    opacity: 1,
    scale: 1,
    borderRadius: 16,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
};

/**
 * Morph transition for button that transforms into modal
 */
export const morphSourceVariants: Variants = {
  initial: {
    opacity: 1,
    scale: 1,
  },
  morphing: {
    opacity: 0,
    scale: 1.1,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
  },
};

/**
 * Content fade animation during morph transitions
 * Content fades out quickly, then fades in after morph completes
 */
export const morphContentVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      delay: 0.15,
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1,
    },
  },
};

/**
 * Shape morph variants for transitioning between shapes
 */
export const shapeMorphVariants = {
  circle: {
    borderRadius: '50%',
    transition: morphSpring,
  },
  pill: {
    borderRadius: '9999px',
    transition: morphSpring,
  },
  rounded: {
    borderRadius: '1rem',
    transition: morphSpring,
  },
  square: {
    borderRadius: '0.5rem',
    transition: morphSpring,
  },
};

/**
 * Multi-element coordination animations
 * For merging multiple elements into one or splitting one into many
 */
export const mergeVariants: Variants = {
  initial: () => ({
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  }),
  merge: (custom: { index: number; total: number }) => ({
    opacity: 0,
    scale: 0.5,
    x: custom.index < custom.total / 2 ? 20 : -20,
    y: 0,
    transition: {
      ...morphSpring,
      delay: custom.index * 0.05,
    },
  }),
};

export const splitVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.5,
  },
  animate: (custom: { index: number; total: number }) => ({
    opacity: 1,
    scale: 1,
    transition: {
      ...morphSpring,
      delay: custom.index * 0.05,
    },
  }),
};

/**
 * Backdrop blur animation for morph modals
 */
export const morphBackdropVariants: Variants = {
  initial: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  animate: {
    opacity: 1,
    backdropFilter: 'blur(8px)',
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
};

/**
 * Get morph variants with reduced motion support
 */
export const getMorphVariants = (variants: Variants, prefersReducedMotion: boolean): Variants => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return variants;
};

/**
 * Get morph transition with reduced motion support
 */
export const getMorphTransition = (prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) {
    return { duration: 0 };
  }
  return morphSpring;
};
