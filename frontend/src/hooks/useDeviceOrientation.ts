import { useState, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

export interface DeviceOrientationState {
  alpha: number | null; // Rotation around z-axis (0-360)
  beta: number | null;  // Rotation around x-axis (-180 to 180)
  gamma: number | null; // Rotation around y-axis (-90 to 90)
  isSupported: boolean;
  hasPermission: boolean;
}

export interface DeviceOrientationResult {
  orientation: DeviceOrientationState;
  /** Normalized values from -1 to 1 for use with glass effects */
  normalized: {
    x: number; // Based on gamma (-90 to 90 -> -1 to 1)
    y: number; // Based on beta (clamped -45 to 45 -> -1 to 1)
  };
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook to access device orientation for gyroscope-based glass effects
 * Returns normalized values for use with CSS custom properties
 */
export function useDeviceOrientation(): DeviceOrientationResult {
  const prefersReducedMotion = useReducedMotion();

  const [orientation, setOrientation] = useState<DeviceOrientationState>({
    alpha: null,
    beta: null,
    gamma: null,
    isSupported: false,
    hasPermission: false,
  });

  // Check if DeviceOrientationEvent is supported
  useEffect(() => {
    const isSupported = 'DeviceOrientationEvent' in window;
    setOrientation((prev) => ({ ...prev, isSupported }));
  }, []);

  // Request permission (required on iOS 13+)
  const requestPermission = async (): Promise<boolean> => {
    if (prefersReducedMotion) return false;

    // Check if permission API exists (iOS 13+)
    const DeviceOrientationEvent = window.DeviceOrientationEvent as typeof window.DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        const hasPermission = permission === 'granted';
        setOrientation((prev) => ({ ...prev, hasPermission }));
        return hasPermission;
      } catch {
        return false;
      }
    }

    // No permission needed (Android, older iOS)
    setOrientation((prev) => ({ ...prev, hasPermission: true }));
    return true;
  };

  // Listen to device orientation events
  useEffect(() => {
    if (!orientation.isSupported || prefersReducedMotion) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setOrientation((prev) => ({
        ...prev,
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        hasPermission: true, // If we receive events, we have permission
      }));
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [orientation.isSupported, prefersReducedMotion]);

  // Calculate normalized values
  const normalized = {
    x: 0,
    y: 0,
  };

  if (!prefersReducedMotion && orientation.gamma !== null) {
    // Normalize gamma (-90 to 90) to (-1 to 1)
    normalized.x = Math.max(-1, Math.min(1, orientation.gamma / 90));
  }

  if (!prefersReducedMotion && orientation.beta !== null) {
    // Clamp beta to -45 to 45 range for more usable values, then normalize
    const clampedBeta = Math.max(-45, Math.min(45, orientation.beta));
    normalized.y = clampedBeta / 45;
  }

  return {
    orientation,
    normalized,
    requestPermission,
  };
}
