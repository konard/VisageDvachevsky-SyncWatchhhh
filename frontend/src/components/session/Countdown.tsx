import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CountdownConfig } from '@syncwatch/shared';

interface CountdownProps {
  config: CountdownConfig;
  onComplete: () => void;
}

/**
 * Countdown Overlay Component
 * Displays animated countdown sequence before playback starts
 */
export const Countdown: React.FC<CountdownProps> = ({ config, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number | string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const now = Date.now();
    const startTime = config.serverStartTime;
    const stepDuration = config.durationMs / config.steps.length;

    // If we're past the start time, calculate which step we should be on
    if (now >= startTime) {
      const elapsed = now - startTime;
      const stepIndex = Math.floor(elapsed / stepDuration);

      if (stepIndex < config.steps.length) {
        setCurrentStep(config.steps[stepIndex]);
      } else {
        // Countdown already finished
        setIsVisible(false);
        onComplete();
        return;
      }
    }

    // Schedule step updates
    config.steps.forEach((step, index) => {
      const stepTime = startTime + (index * stepDuration);
      const delay = stepTime - now;

      if (delay > 0) {
        setTimeout(() => {
          setCurrentStep(step);
        }, delay);
      }
    });

    // Schedule completion
    const endTime = startTime + config.durationMs;
    const endDelay = endTime - now;

    if (endDelay > 0) {
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300); // Allow fade-out animation
      }, endDelay);
    }
  }, [config, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {currentStep !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%)',
          }}
        >
          <motion.div
            key={currentStep}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: 'easeOut',
            }}
            className="relative"
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 0.75,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Main countdown display */}
            <div className="relative flex items-center justify-center w-48 h-48 sm:w-64 sm:h-64">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(6,182,212,0.3)',
                  boxShadow: '0 0 60px rgba(6,182,212,0.3), inset 0 0 60px rgba(6,182,212,0.1)',
                }}
              />

              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="relative text-8xl sm:text-9xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 40px rgba(6,182,212,0.5)',
                }}
              >
                {currentStep}
              </motion.span>
            </div>

            {/* Particle effects */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-cyan-400"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [0, Math.cos((i / 8) * Math.PI * 2) * 100],
                  y: [0, Math.sin((i / 8) * Math.PI * 2) * 100],
                  opacity: [1, 0],
                  scale: [1, 0.5],
                }}
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
