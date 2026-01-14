import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks';
import { skeletonPulse, skeletonTransition, getVariants, getTransition } from '../utils/animations';

interface AnimatedSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

/**
 * Animated loading skeleton with pulse effect
 * Useful for loading states
 */
export const AnimatedSkeleton = ({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
}: AnimatedSkeletonProps) => {
  const prefersReducedMotion = useReducedMotion();

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <motion.div
      variants={getVariants(skeletonPulse, prefersReducedMotion)}
      initial="initial"
      animate="animate"
      transition={getTransition(skeletonTransition, prefersReducedMotion)}
      className={`bg-slate-700 ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

/**
 * Skeleton for text lines
 */
export const SkeletonText = ({ lines = 3 }: { lines?: number }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <AnimatedSkeleton
          key={i}
          height="1rem"
          width={i === lines - 1 ? '80%' : '100%'}
          variant="text"
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for avatar/profile picture
 */
export const SkeletonAvatar = ({ size = 48 }: { size?: number }) => {
  return <AnimatedSkeleton width={size} height={size} variant="circular" />;
};

/**
 * Skeleton for card/panel
 */
export const SkeletonCard = () => {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <SkeletonAvatar size={64} />
        <div className="flex-1 space-y-2">
          <AnimatedSkeleton height="1.25rem" width="60%" variant="text" />
          <AnimatedSkeleton height="1rem" width="40%" variant="text" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};
