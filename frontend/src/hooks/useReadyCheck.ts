import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { ReadyCheck, CountdownConfig } from '@syncwatch/shared';

interface UseReadyCheckReturn {
  activeCheck: ReadyCheck | null;
  countdownConfig: CountdownConfig | null;
  initiateReadyCheck: () => void;
  respondToReadyCheck: (checkId: string, status: 'ready' | 'not_ready') => void;
}

/**
 * Hook to manage ready checks and countdown sequences
 */
export function useReadyCheck(): UseReadyCheckReturn {
  const { socket, isConnected } = useSocket();
  const [activeCheck, setActiveCheck] = useState<ReadyCheck | null>(null);
  const [countdownConfig, setCountdownConfig] = useState<CountdownConfig | null>(null);

  // Listen for ready check events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Ready check started
    socket.on('ready:start', (data) => {
      setActiveCheck(data.check);
    });

    // Ready check updated (participant responded)
    socket.on('ready:update', (data) => {
      setActiveCheck(data.check);
    });

    // Ready check completed
    socket.on('ready:complete', (data) => {
      setActiveCheck(null);

      if (data.allReady) {
        // All participants ready, countdown will start soon
        console.log('All participants ready! Countdown starting...');
      } else {
        // Not all ready, check cancelled
        console.log('Ready check cancelled');
      }
    });

    // Ready check timed out
    socket.on('ready:timeout', () => {
      console.log('Ready check timed out');
    });

    // Countdown started
    socket.on('countdown:start', (data) => {
      setCountdownConfig(data.config);
    });

    // Countdown tick (optional, for debugging)
    socket.on('countdown:tick', (data) => {
      console.log('Countdown tick:', data.step, 'remaining:', data.remaining);
    });

    // Countdown completed
    socket.on('countdown:complete', () => {
      setCountdownConfig(null);
      console.log('Countdown completed!');
    });

    return () => {
      socket.off('ready:start');
      socket.off('ready:update');
      socket.off('ready:complete');
      socket.off('ready:timeout');
      socket.off('countdown:start');
      socket.off('countdown:tick');
      socket.off('countdown:complete');
    };
  }, [socket, isConnected]);

  // Initiate ready check (owner only)
  const initiateReadyCheck = useCallback(() => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('ready:initiate', {});
  }, [socket, isConnected]);

  // Respond to ready check
  const respondToReadyCheck = useCallback((checkId: string, status: 'ready' | 'not_ready') => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('ready:respond', { checkId, status });
  }, [socket, isConnected]);

  return {
    activeCheck,
    countdownConfig,
    initiateReadyCheck,
    respondToReadyCheck,
  };
}
