import { useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useChatStore, ChatMessage, SystemEvent } from '../stores/chat.store';
import { useToast } from '../components/toast';

interface UseChatOptions {
  socket: Socket | null;
  roomCode: string | null;
  userId?: string;
  username?: string;
  enabled?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  typingUsers: Map<string, { userId: string; username: string; startedAt: number }>;
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
  sendMessage: (content: string) => void;
  sendTyping: () => void;
  loadMoreHistory: () => Promise<void>;
  retryMessage: (tempId: string) => void;
}

/**
 * Custom hook for managing chat functionality with WebSocket
 */
export function useChat({
  socket,
  roomCode,
  userId,
  username,
  enabled = true,
}: UseChatOptions): UseChatReturn {
  const toast = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Get chat store state and actions
  const {
    messages,
    isConnected,
    typingUsers,
    hasMoreHistory,
    isLoadingHistory,
    addMessage,
    addOptimisticMessage,
    confirmMessage,
    failMessage,
    retryMessage: retryMessageStore,
    setMessages,
    prependMessages,
    setHasMoreHistory,
    setIsLoadingHistory,
    addTypingUser,
    removeTypingUser,
    clearTypingUsers,
    setIsConnected,
    reset,
  } = useChatStore();

  /**
   * Send a chat message with optimistic update
   */
  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !socket.connected || !enabled) {
        toast.error('Not connected to chat');
        return;
      }

      if (!roomCode) {
        toast.error('Not in a room');
        return;
      }

      if (!userId || !username) {
        toast.error('User information not available');
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return;
      }

      // Create temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // Add optimistic message
      addOptimisticMessage(tempId, trimmedContent, userId, username);

      // Emit to server
      socket.emit('chat:message', { content: trimmedContent });

      // Note: We'll confirm the message when we receive it back from the server
      // This is handled in the chat:message event listener
    },
    [socket, roomCode, userId, username, enabled, addOptimisticMessage, toast]
  );

  /**
   * Send typing indicator (debounced)
   */
  const sendTyping = useCallback(() => {
    if (!socket || !socket.connected || !enabled || !roomCode) {
      return;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator if not already sent
    if (!isTypingRef.current) {
      socket.emit('chat:typing', { isTyping: true });
      isTypingRef.current = true;
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && socket.connected) {
        socket.emit('chat:typing', { isTyping: false });
        isTypingRef.current = false;
      }
    }, 3000);
  }, [socket, roomCode, enabled]);

  /**
   * Load more chat history
   */
  const loadMoreHistory = useCallback(async () => {
    if (!socket || !socket.connected || !enabled || isLoadingHistory || !hasMoreHistory) {
      return;
    }

    setIsLoadingHistory(true);

    try {
      // Get the oldest message timestamp
      const oldestTimestamp = messages.length > 0 ? messages[0].timestamp : Date.now();

      // Request history before this timestamp
      socket.emit('chat:load-history', {
        before: oldestTimestamp,
        limit: 50,
      });

      // The response will be handled by the chat:history event listener
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast.error('Failed to load chat history');
      setIsLoadingHistory(false);
    }
  }, [socket, enabled, isLoadingHistory, hasMoreHistory, messages, setIsLoadingHistory, toast]);

  /**
   * Retry sending a failed message
   */
  const retryMessage = useCallback(
    (tempId: string) => {
      const message = messages.find((m) => m.tempId === tempId);
      if (!message || !message.content) {
        return;
      }

      retryMessageStore(tempId);
      sendMessage(message.content);
    },
    [messages, retryMessageStore, sendMessage]
  );

  /**
   * Setup WebSocket event listeners
   */
  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    // Handle new chat message
    const handleChatMessage = (message: ChatMessage) => {
      // Check if this is a confirmation of our optimistic message
      const pendingMessage = messages.find(
        (m) => m.pending && m.content === message.content && m.userId === message.userId
      );

      if (pendingMessage && pendingMessage.tempId) {
        // Confirm the optimistic message
        confirmMessage(pendingMessage.tempId, message);
      } else {
        // Add new message from another user or system
        addMessage(message);
      }

      // Clear typing indicator for this user
      if (message.type === 'user' && message.userId) {
        removeTypingUser(message.userId);
      }
    };

    // Handle chat history
    const handleChatHistory = (data: { messages: ChatMessage[]; hasMore?: boolean }) => {
      if (data.messages.length === 0) {
        // Initial history on room join
        setMessages(data.messages);
        setHasMoreHistory(data.hasMore || false);
      } else {
        // Prepend older messages
        prependMessages(data.messages);
        setHasMoreHistory(data.hasMore || false);
      }
      setIsLoadingHistory(false);
    };

    // Handle chat errors
    const handleChatError = (error: { code: string; message: string }) => {
      console.error('Chat error:', error);

      // Find and mark failed optimistic messages
      const pendingMessages = messages.filter((m) => m.pending);
      if (pendingMessages.length > 0) {
        const lastPending = pendingMessages[pendingMessages.length - 1];
        if (lastPending.tempId) {
          failMessage(lastPending.tempId);
        }
      }

      // Show error toast
      if (error.code === 'GUEST_CANNOT_CHAT') {
        toast.error('Guests cannot send chat messages');
      } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('You are sending messages too quickly');
      } else {
        toast.error(error.message || 'Failed to send message');
      }
    };

    // Handle typing indicators
    const handleTyping = (data: { userId: string; username: string; isTyping: boolean }) => {
      // Don't show our own typing indicator
      if (data.userId === userId) {
        return;
      }

      if (data.isTyping) {
        addTypingUser(data.userId, data.username);
      } else {
        removeTypingUser(data.userId);
      }
    };

    // Handle connection status
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      clearTypingUsers();
    };

    // Register event listeners
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:history', handleChatHistory);
    socket.on('chat:error', handleChatError);
    socket.on('chat:typing', handleTyping);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial connection status
    setIsConnected(socket.connected);

    // Cleanup
    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:history', handleChatHistory);
      socket.off('chat:error', handleChatError);
      socket.off('chat:typing', handleTyping);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing on unmount
      if (isTypingRef.current && socket.connected) {
        socket.emit('chat:typing', { isTyping: false });
      }
    };
  }, [
    socket,
    enabled,
    userId,
    messages,
    addMessage,
    confirmMessage,
    failMessage,
    setMessages,
    prependMessages,
    setHasMoreHistory,
    setIsLoadingHistory,
    addTypingUser,
    removeTypingUser,
    clearTypingUsers,
    setIsConnected,
    toast,
  ]);

  /**
   * Clean up typing timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Reset chat store when room changes
   */
  useEffect(() => {
    if (!roomCode) {
      reset();
    }
  }, [roomCode, reset]);

  return {
    messages,
    isConnected,
    typingUsers,
    hasMoreHistory,
    isLoadingHistory,
    sendMessage,
    sendTyping,
    loadMoreHistory,
    retryMessage,
  };
}
