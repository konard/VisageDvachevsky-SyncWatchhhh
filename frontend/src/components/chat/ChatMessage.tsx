import { memo } from 'react';

interface ChatMessageProps {
  user: string;
  text: string;
  timestamp: Date;
  style?: React.CSSProperties;
}

/**
 * Optimized Chat Message Component with React.memo
 * Prevents unnecessary re-renders when parent updates
 */
export const ChatMessage = memo(function ChatMessage({
  user,
  text,
  timestamp,
  style,
}: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={style} className="group px-4 py-2">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-medium text-accent-cyan text-sm">
          {user}
        </span>
        <span className="text-xs text-gray-500">
          {formatTime(timestamp)}
        </span>
      </div>
      <div className="text-gray-200 text-sm pl-0">
        {text}
      </div>
    </div>
  );
});
