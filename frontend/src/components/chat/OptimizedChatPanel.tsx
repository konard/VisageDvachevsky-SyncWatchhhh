import { useState, useRef, useEffect, useCallback, memo } from 'react';
import clsx from 'clsx';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

interface OptimizedChatPanelProps {
  className?: string;
}

/**
 * Optimized Chat Message Component with React.memo
 */
const ChatMessageItem = memo(function ChatMessageItem({
  message,
}: {
  message: Message;
}) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="group px-4 py-2">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-medium text-accent-cyan text-sm">
          {message.user}
        </span>
        <span className="text-xs text-gray-500">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div className="text-gray-200 text-sm pl-0">
        {message.text}
      </div>
    </div>
  );
});

/**
 * Optimized Chat Panel Component
 * Features:
 * - React.memo for message components to prevent unnecessary re-renders
 * - useCallback for event handlers
 * - Efficient scroll management
 * - Ready for virtual scrolling implementation with react-window
 */
export function OptimizedChatPanel({ className }: OptimizedChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'Alice',
      text: 'Hey everyone!',
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: '2',
      user: 'Bob',
      text: 'Ready to watch?',
      timestamp: new Date(Date.now() - 30000),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      user: 'You',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
  }, [inputValue]);

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 glass-input text-sm"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 py-2 glass-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
