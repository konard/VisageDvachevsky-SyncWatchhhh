import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useReducedMotion } from '../hooks';
import { chatMessageVariants, getVariants } from '../utils/animations';

interface AnimatedChatMessageProps {
  children: ReactNode;
  className?: string;
  isOwn?: boolean;
}

/**
 * Animated chat message component
 * Appears with a fade-in and slide-up animation
 */
export const AnimatedChatMessage = ({
  children,
  className = '',
  isOwn = false,
}: AnimatedChatMessageProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={getVariants(chatMessageVariants, prefersReducedMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        flex ${isOwn ? 'justify-end' : 'justify-start'}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

interface ChatBubbleProps {
  message: string;
  sender: string;
  timestamp?: string;
  isOwn?: boolean;
}

/**
 * Chat bubble with animation
 */
export const ChatBubble = ({ message, sender, timestamp, isOwn = false }: ChatBubbleProps) => {
  return (
    <AnimatedChatMessage isOwn={isOwn}>
      <div
        className={`
        max-w-[70%] px-4 py-2 rounded-2xl
        ${
          isOwn
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-700 text-white rounded-bl-sm'
        }
      `}
      >
        {!isOwn && <p className="text-xs text-gray-300 mb-1">{sender}</p>}
        <p className="break-words">{message}</p>
        {timestamp && <p className="text-xs text-gray-300 mt-1 text-right">{timestamp}</p>}
      </div>
    </AnimatedChatMessage>
  );
};
