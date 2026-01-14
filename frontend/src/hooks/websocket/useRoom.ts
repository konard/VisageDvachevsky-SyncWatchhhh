import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useToast } from '../../components/toast';

interface UseRoomOptions {
  socket: Socket | null;
  roomCode: string;
  userId?: string;
  autoRejoin?: boolean;
  onJoined?: (data: any) => void;
  onLeft?: () => void;
  onError?: (error: string) => void;
}

interface UseRoomReturn {
  isInRoom: boolean;
  joinRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  error: string | null;
}

/**
 * Custom hook for managing room state with auto-reconnection
 */
export function useRoom(options: UseRoomOptions): UseRoomReturn {
  const {
    socket,
    roomCode,
    userId,
    autoRejoin = true,
    onJoined,
    onLeft,
    onError,
  } = options;

  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);
  const toast = useToast();

  const joinRoom = useCallback(async () => {
    if (!socket || !socket.connected) {
      const errorMsg = 'Cannot join room: not connected to server';
      setError(errorMsg);
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (isInRoom) {
      return;
    }

    try {
      socket.emit('room:join', { roomCode, userId });
      hasJoinedRef.current = true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMsg);
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  }, [socket, roomCode, userId, isInRoom, toast, onError]);

  const leaveRoom = useCallback(async () => {
    if (!socket) {
      return;
    }

    try {
      socket.emit('room:leave', { roomCode });
      hasJoinedRef.current = false;
      setIsInRoom(false);
      onLeft?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to leave room';
      setError(errorMsg);
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  }, [socket, roomCode, toast, onError, onLeft]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Handle successful room join
    const handleRoomJoined = (data: any) => {
      setIsInRoom(true);
      setError(null);
      toast.success(`Joined room ${roomCode}`);
      onJoined?.(data);
    };

    // Handle room join error
    const handleRoomError = (data: { error: string }) => {
      setError(data.error);
      setIsInRoom(false);
      hasJoinedRef.current = false;

      // Show user-friendly error messages
      const errorMessages: Record<string, string> = {
        'Room not found': 'Room not found or has expired',
        'Room is full': 'Room is full (5/5 participants)',
        'Already in room': 'You are already in this room',
      };

      const message = errorMessages[data.error] || data.error;
      toast.error(message);
      onError?.(data.error);
    };

    // Handle forced disconnect from room
    const handleRoomLeft = () => {
      setIsInRoom(false);
      hasJoinedRef.current = false;
      toast.info('Left the room');
      onLeft?.();
    };

    // Handle reconnection - auto-rejoin room if previously in it
    const handleReconnect = () => {
      if (autoRejoin && hasJoinedRef.current && !isInRoom) {
        toast.info('Rejoining room...', { duration: 2000 });
        joinRoom();
      }
    };

    // Register event handlers
    socket.on('room:joined', handleRoomJoined);
    socket.on('room:error', handleRoomError);
    socket.on('room:left', handleRoomLeft);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:error', handleRoomError);
      socket.off('room:left', handleRoomLeft);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, roomCode, isInRoom, autoRejoin, joinRoom, toast, onJoined, onError, onLeft]);

  return {
    isInRoom,
    joinRoom,
    leaveRoom,
    error,
  };
}
