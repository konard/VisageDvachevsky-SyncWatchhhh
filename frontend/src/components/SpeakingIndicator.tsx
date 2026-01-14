import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks';
import { speakingPulse, speakingTransition } from '../utils/animations';

interface SpeakingIndicatorProps {
  isSpeaking: boolean;
  children?: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Speaking indicator with pulse animation
 * Pulses with a cyan glow when speaking
 */
export const SpeakingIndicator = ({
  isSpeaking,
  children,
  className = '',
  size = 'medium',
}: SpeakingIndicatorProps) => {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  return (
    <motion.div
      className={`
        relative rounded-full flex items-center justify-center
        ${sizeClasses[size]}
        ${className}
      `}
      animate={
        isSpeaking && !prefersReducedMotion
          ? speakingPulse
          : { boxShadow: '0 0 0px transparent' }
      }
      transition={speakingTransition}
    >
      {children}
    </motion.div>
  );
};

/**
 * Voice activation bars indicator
 * Shows animated bars when speaking
 */
export const VoiceBars = ({ isSpeaking }: { isSpeaking: boolean }) => {
  const prefersReducedMotion = useReducedMotion();

  const bars = [
    { delay: 0, height: [4, 16, 4] },
    { delay: 0.1, height: [8, 20, 8] },
    { delay: 0.2, height: [4, 12, 4] },
  ];

  return (
    <div className="flex items-center gap-1 h-6">
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          className="w-1 bg-cyan-400 rounded-full"
          animate={
            isSpeaking && !prefersReducedMotion
              ? {
                  height: bar.height,
                }
              : {
                  height: 4,
                }
          }
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: bar.delay,
          }}
        />
      ))}
    </div>
  );
};
