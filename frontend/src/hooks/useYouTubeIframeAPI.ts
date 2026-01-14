/**
 * React hook for loading YouTube IFrame API
 * Ensures the API is only loaded once globally
 */

import { useEffect, useState } from 'react';

// Global state to track API loading
let isApiLoading = false;
let isApiLoaded = false;
const apiLoadCallbacks: Array<() => void> = [];

// Declare global YT type
declare global {
  interface Window {
    YT: typeof YT | undefined;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

/**
 * Load the YouTube IFrame API script
 */
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isApiLoaded && window.YT) {
      resolve();
      return;
    }

    // If currently loading, add to callbacks
    if (isApiLoading) {
      apiLoadCallbacks.push(resolve);
      return;
    }

    // Start loading
    isApiLoading = true;
    apiLoadCallbacks.push(resolve);

    // Create script tag
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      isApiLoading = false;
      reject(new Error('Failed to load YouTube IFrame API'));
    };

    // YouTube API calls this function when ready
    window.onYouTubeIframeAPIReady = () => {
      isApiLoaded = true;
      isApiLoading = false;

      // Call all waiting callbacks
      apiLoadCallbacks.forEach(callback => callback());
      apiLoadCallbacks.length = 0;
    };

    // Insert script
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
}

export interface UseYouTubeIframeAPIResult {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
}

/**
 * Hook to load and track YouTube IFrame API status
 */
export function useYouTubeIframeAPI(): UseYouTubeIframeAPIResult {
  const [isLoading, setIsLoading] = useState(!isApiLoaded);
  const [isLoaded, setIsLoaded] = useState(isApiLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isApiLoaded) {
      setIsLoading(false);
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    loadYouTubeAPI()
      .then(() => {
        setIsLoading(false);
        setIsLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setIsLoading(false);
        setIsLoaded(false);
        setError(err);
      });
  }, []);

  return { isLoading, isLoaded, error };
}
