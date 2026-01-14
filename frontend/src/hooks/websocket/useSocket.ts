import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../../components/toast';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface UseSocketOptions {
  namespace?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
  showToasts?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  error: Error | null;
}

/**
 * Custom hook for managing WebSocket connections with automatic reconnection
 */
export function useSocket(url: string, options: UseSocketOptions = {}): UseSocketReturn {
  const {
    namespace = '/sync',
    autoConnect = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 10000,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    showToasts = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttemptRef = useRef(0);
  const toast = useToast();

  const createSocket = useCallback(() => {
    if (socketRef.current) {
      return socketRef.current;
    }

    const fullUrl = `${url}${namespace}`;
    const socket = io(fullUrl, {
      autoConnect,
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    return socket;
  }, [url, namespace, autoConnect, reconnectionAttempts, reconnectionDelay, reconnectionDelayMax]);

  const connect = useCallback(() => {
    const socket = createSocket();
    if (!socket.connected) {
      setConnectionStatus('connecting');
      socket.connect();
    }
  }, [createSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setConnectionStatus('disconnected');
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    const socket = createSocket();

    // Connection successful
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptRef.current = 0;

      if (showToasts) {
        toast.success('Connected to server');
      }

      onConnect?.();
    };

    // Disconnection
    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');

      if (showToasts) {
        if (reason === 'io server disconnect') {
          toast.warning('Disconnected by server');
        } else if (reason === 'transport close') {
          toast.warning('Connection lost. Reconnecting...', {
            duration: 3000,
          });
        }
      }

      onDisconnect?.(reason);

      // Manually reconnect if server disconnected us
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          socket.connect();
        }, reconnectionDelay);
      }
    };

    // Connection error
    const handleConnectError = (err: Error) => {
      setError(err);
      setConnectionStatus('error');

      if (showToasts && reconnectAttemptRef.current === 0) {
        toast.error('Failed to connect to server', {
          description: 'Please check your internet connection',
        });
      }

      onError?.(err);
    };

    // Reconnection attempt
    const handleReconnectAttempt = (attempt: number) => {
      reconnectAttemptRef.current = attempt;
      setConnectionStatus('reconnecting');

      if (showToasts && attempt === 1) {
        toast.info('Reconnecting...', {
          duration: 3000,
        });
      }
    };

    // Reconnection failed
    const handleReconnectFailed = () => {
      setConnectionStatus('error');

      if (showToasts) {
        toast.error('Failed to reconnect', {
          description: 'Please refresh the page or check your connection',
          duration: 0, // Don't auto-dismiss
          action: {
            label: 'Retry',
            onClick: () => {
              reconnect();
            },
          },
        });
      }
    };

    // Reconnection successful
    const handleReconnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptRef.current = 0;

      if (showToasts) {
        toast.success('Reconnected to server');
      }

      onReconnect?.();
    };

    // Register event handlers
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_failed', handleReconnectFailed);
    socket.on('reconnect', handleReconnect);

    // Auto-connect if enabled
    if (autoConnect && !socket.connected) {
      connect();
    }

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('reconnect_failed', handleReconnectFailed);
      socket.off('reconnect', handleReconnect);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [createSocket, connect, reconnect, reconnectionDelay, showToasts, toast, onConnect, onDisconnect, onError, onReconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    error,
  };
}
