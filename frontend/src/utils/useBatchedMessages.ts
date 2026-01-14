import { useEffect, useRef, useCallback, useState } from 'react';

interface BatchConfig {
  maxBatchSize?: number;
  maxWaitTime?: number; // in milliseconds
}

/**
 * Custom hook for batching WebSocket messages
 * Reduces number of state updates and re-renders
 *
 * @param callback - Function to call with batched messages
 * @param config - Batching configuration
 * @returns Function to add messages to the batch
 */
export function useBatchedMessages<T>(
  callback: (messages: T[]) => void,
  config: BatchConfig = {}
) {
  const { maxBatchSize = 10, maxWaitTime = 100 } = config;

  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(() => {
    if (batchRef.current.length > 0) {
      callback([...batchRef.current]);
      batchRef.current = [];
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [callback]);

  const addMessage = useCallback((message: T) => {
    batchRef.current.push(message);

    // Flush if batch is full
    if (batchRef.current.length >= maxBatchSize) {
      flush();
      return;
    }

    // Set timeout to flush after maxWaitTime
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(flush, maxWaitTime);
    }
  }, [maxBatchSize, maxWaitTime, flush]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flush();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [flush]);

  return addMessage;
}

/**
 * Debounce hook for expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for rate-limiting function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRunRef = useRef<number>(Date.now());

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= delay) {
      callback(...args);
      lastRunRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRunRef.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback as T;
}
