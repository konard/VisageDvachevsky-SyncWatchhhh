import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Send, MessageCircle, Info, AlertCircle } from 'lucide-react';
import { useSound } from '@/hooks';
import { GlassAvatar } from '../ui/glass';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  type?: 'user' | 'system' | 'info' | 'warning';
  avatar?: string;
}

interface ChatPanelProps {
  className?: string;
}

/**
 * Chat Panel Component
 * Displays chat messages with liquid-glass styling and system message support
 */
export function ChatPanel({ className }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'sys-1',
      user: 'System',
      text: 'Welcome to the room! Video synchronization is ready.',
      timestamp: new Date(Date.now() - 120000),
      type: 'system',
    },
    {
      id: '1',
      user: 'Alice',
      text: 'Hey everyone!',
      timestamp: new Date(Date.now() - 60000),
      type: 'user',
    },
    {
      id: '2',
      user: 'Bob',
      text: 'Ready to watch?',
      timestamp: new Date(Date.now() - 30000),
      type: 'user',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playMessage } = useSound();
  const previousMessageCountRef = useRef(messages.length);

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

    const newMessage: Message = {
      id: Date.now().toString(),
      user: 'You',
      text: inputValue,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageStyle = (type: Message['type']) => {
    switch (type) {
      case 'system':
        return 'bg-accent-cyan/10 border-l-2 border-accent-cyan';
      case 'info':
        return 'bg-blue-500/10 border-l-2 border-blue-500';
      case 'warning':
        return 'bg-yellow-500/10 border-l-2 border-yellow-500';
      default:
        return '';
    }
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'system':
        return <MessageCircle className="w-4 h-4 text-accent-cyan" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-accent-cyan" />
        <h3 className="font-medium text-white">Chat</h3>
        <span className="text-xs text-gray-500 ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'group rounded-lg transition-colors',
              message.type !== 'user' && 'px-3 py-2',
              getMessageStyle(message.type)
            )}
          >
            {message.type !== 'user' ? (
              // System/Info/Warning message
              <div className="flex items-start gap-2">
                {getMessageIcon(message.type)}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-400">
                      {message.user}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-0.5">{message.text}</p>
                </div>
              </div>
            ) : (
              // User message
              <div className="flex gap-3 hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors">
                <GlassAvatar
                  size="sm"
                  fallback={message.user.slice(0, 2).toUpperCase()}
                  status={message.user === 'You' ? undefined : 'online'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span
                      className={clsx(
                        'font-medium text-sm',
                        message.user === 'You' ? 'text-accent-blue' : 'text-accent-cyan'
                      )}
                    >
                      {message.user}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-200 text-sm break-words">{message.text}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="w-full glass-input text-sm pr-10"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim()}
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
