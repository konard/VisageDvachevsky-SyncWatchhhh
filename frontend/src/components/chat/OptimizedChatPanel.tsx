import { useState, useRef, useEffect, useCallback, memo } from 'react';
import clsx from 'clsx';
import { Send, MessageCircle, Loader2, RefreshCw } from 'lucide-react';
import { useChat } from '@/hooks';
import { GlassAvatar } from '../ui/glass';
import { Socket } from 'socket.io-client';
import { ChatMessage, SystemEvent } from '@/stores';

interface OptimizedChatPanelProps {
  className?: string;
  socket?: Socket | null;
  roomCode?: string | null;
  userId?: string;
  username?: string;
}

/**
 * Optimized Chat Message Component with React.memo
 */
const ChatMessageItem = memo(function ChatMessageItem({
  message,
  currentUserId,
  onRetry,
}: {
  message: ChatMessage;
  currentUserId?: string;
  onRetry?: (tempId: string) => void;
}) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSystemMessage = (event: SystemEvent): string => {
    switch (event.kind) {
      case 'join':
        return `${event.username} joined the room`;
      case 'leave':
        return `${event.username} left the room`;
      case 'play':
        return 'Playback started';
      case 'pause':
        return 'Playback paused';
      case 'seek':
        return `Seeked to ${Math.floor(event.position / 60)}:${String(Math.floor(event.position % 60)).padStart(2, '0')}`;
      default:
        return 'System event';
    }
  };

  if (message.type === 'system' && message.event) {
    return (
      <div className="px-3 py-2 bg-accent-cyan/10 border-l-2 border-accent-cyan rounded-lg">
        <div className="flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-accent-cyan mt-0.5" />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-gray-400">System</span>
              <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-300 mt-0.5">{formatSystemMessage(message.event)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex gap-3 hover:bg-white/5 rounded-lg p-2 transition-colors',
        message.failed && 'opacity-50',
        message.pending && 'opacity-70'
      )}
    >
      <GlassAvatar
        size="sm"
        src={message.avatarUrl}
        fallback={(message.username || 'U').slice(0, 2).toUpperCase()}
        status={message.userId === currentUserId ? undefined : 'online'}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className={clsx(
              'font-medium text-sm',
              message.userId === currentUserId ? 'text-accent-blue' : 'text-accent-cyan'
            )}
          >
            {message.username || 'Unknown'}
            {message.userId === currentUserId && ' (You)'}
          </span>
          <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
          {message.pending && <span className="text-xs text-gray-500 italic">Sending...</span>}
          {message.failed && onRetry && message.tempId && (
            <button
              onClick={() => onRetry(message.tempId!)}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              aria-label="Retry sending message"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
        <p className="text-gray-200 text-sm break-words">{message.content}</p>
      </div>
    </div>
  );
});

/**
 * Optimized Chat Panel Component with WebSocket integration
 * Features:
 * - React.memo for message components to prevent unnecessary re-renders
 * - useCallback for event handlers
 * - Efficient scroll management
 * - WebSocket integration for real-time messaging
 * - Optimistic updates
 * - Typing indicators
 * - Message history loading
 */
export function OptimizedChatPanel({
  className,
  socket,
  roomCode,
  userId,
  username,
}: OptimizedChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Use chat hook for WebSocket integration
  const {
    messages,
    isConnected,
    typingUsers,
    hasMoreHistory,
    isLoadingHistory,
    sendMessage,
    sendTyping,
    loadMoreHistory,
    retryMessage,
  } = useChat({
    socket: socket || null,
    roomCode: roomCode || null,
    userId,
    username,
    enabled: !!socket && !!roomCode,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim()) return;

      sendMessage(inputValue);
      setInputValue('');
    },
    [inputValue, sendMessage]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      sendTyping();
    },
    [sendTyping]
  );

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || isLoadingHistory || !hasMoreHistory) {
      return;
    }

    const { scrollTop } = messagesContainerRef.current;

    // Load more when scrolled near the top (within 100px)
    if (scrollTop < 100) {
      loadMoreHistory();
    }
  }, [isLoadingHistory, hasMoreHistory, loadMoreHistory]);

  // Get typing users as array
  const typingUsersArray = Array.from(typingUsers.values());

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-accent-cyan" />
        <h3 className="font-medium text-white">Chat</h3>
        <span className="text-xs text-gray-500 ml-auto">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
        {!isConnected && <span className="text-xs text-yellow-500">Disconnected</span>}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {isLoadingHistory && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />
          </div>
        )}

        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            currentUserId={userId}
            onRetry={retryMessage}
          />
        ))}

        {/* Typing indicators */}
        {typingUsersArray.length > 0 && (
          <div className="flex gap-2 items-center text-sm text-gray-400 italic px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            {typingUsersArray.length === 1
              ? `${typingUsersArray[0].username} is typing...`
              : typingUsersArray.length === 2
              ? `${typingUsersArray[0].username} and ${typingUsersArray[1].username} are typing...`
              : `${typingUsersArray.length} people are typing...`}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={isConnected ? 'Type a message...' : 'Connecting to chat...'}
            disabled={!isConnected}
            className="flex-1 glass-input text-sm"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !isConnected}
            className="w-10 h-10 glass-button flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
