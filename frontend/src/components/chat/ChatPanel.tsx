import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Send, MessageCircle, Info, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useSound, useChat } from '@/hooks';
import { GlassAvatar } from '../ui/glass';
import { Socket } from 'socket.io-client';
import { SystemEvent } from '@/stores';

interface ChatPanelProps {
  className?: string;
  socket?: Socket | null;
  roomCode?: string | null;
  userId?: string;
  username?: string;
}

/**
 * Chat Panel Component
 * Displays chat messages with liquid-glass styling, WebSocket integration, and system message support
 */
export function ChatPanel({
  className,
  socket,
  roomCode,
  userId,
  username,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { playMessage } = useSound();
  const previousMessageCountRef = useRef(0);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();

    // Play sound for new messages (but not on initial render)
    if (messages.length > previousMessageCountRef.current) {
      playMessage();
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, playMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    sendMessage(inputValue);
    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    sendTyping();
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current || isLoadingHistory || !hasMoreHistory) {
      return;
    }

    const { scrollTop } = messagesContainerRef.current;

    // Load more when scrolled near the top (within 100px)
    if (scrollTop < 100) {
      loadMoreHistory();
    }
  };

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

  const getMessageStyle = (messageType: 'user' | 'system', failed?: boolean, pending?: boolean) => {
    if (failed) {
      return 'opacity-50';
    }
    if (pending) {
      return 'opacity-70';
    }
    if (messageType === 'system') {
      return 'bg-accent-cyan/10 border-l-2 border-accent-cyan';
    }
    return '';
  };

  const getMessageIcon = (messageType: 'system') => {
    return <MessageCircle className="w-4 h-4 text-accent-cyan" />;
  };

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
        {!isConnected && (
          <span className="text-xs text-yellow-500">Disconnected</span>
        )}
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
          <div
            key={message.id}
            className={clsx(
              'group rounded-lg transition-colors',
              message.type === 'system' && 'px-3 py-2',
              getMessageStyle(message.type, message.failed, message.pending)
            )}
          >
            {message.type === 'system' && message.event ? (
              // System message
              <div className="flex items-start gap-2">
                {getMessageIcon('system')}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-400">System</span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-0.5">
                    {formatSystemMessage(message.event)}
                  </p>
                </div>
              </div>
            ) : (
              // User message
              <div className="flex gap-3 hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors relative">
                <GlassAvatar
                  size="sm"
                  src={message.avatarUrl}
                  fallback={(message.username || 'U').slice(0, 2).toUpperCase()}
                  status={message.userId === userId ? undefined : 'online'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span
                      className={clsx(
                        'font-medium text-sm',
                        message.userId === userId ? 'text-accent-blue' : 'text-accent-cyan'
                      )}
                    >
                      {message.username || 'Unknown'}
                      {message.userId === userId && ' (You)'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.pending && (
                      <span className="text-xs text-gray-500 italic">Sending...</span>
                    )}
                    {message.failed && (
                      <button
                        onClick={() => message.tempId && retryMessage(message.tempId)}
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
            )}
          </div>
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
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={
                isConnected
                  ? 'Type a message...'
                  : 'Connecting to chat...'
              }
              disabled={!isConnected}
              className="w-full glass-input text-sm pr-10"
            />
          </div>
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
