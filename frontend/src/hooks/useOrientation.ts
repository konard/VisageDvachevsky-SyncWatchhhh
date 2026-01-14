import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

/**
 * Hook to detect screen orientation
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (typeof window === 'undefined') {
      return 'portrait';
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
    };

    // Listen to resize events for orientation changes
    window.addEventListener('resize', handleOrientationChange);

    // Also listen to orientationchange event if available
    if ('onorientationchange' in window) {
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      if ('onorientationchange' in window) {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
    };
  }, []);

  return orientation;
}
