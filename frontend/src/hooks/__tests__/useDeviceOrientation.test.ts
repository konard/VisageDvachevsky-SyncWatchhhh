import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeviceOrientation } from '../useDeviceOrientation';

// Mock useReducedMotion
vi.mock('../useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('useDeviceOrientation', () => {
  const originalDeviceOrientationEvent = window.DeviceOrientationEvent;
  let orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  beforeEach(() => {
    // Mock DeviceOrientationEvent
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: class MockDeviceOrientationEvent {},
      writable: true,
      configurable: true,
    });

    // Mock addEventListener to capture the orientation handler
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'deviceorientation') {
        orientationHandler = handler as (event: DeviceOrientationEvent) => void;
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: originalDeviceOrientationEvent,
      writable: true,
      configurable: true,
    });
    orientationHandler = null;
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    expect(result.current.orientation.alpha).toBe(null);
    expect(result.current.orientation.beta).toBe(null);
    expect(result.current.orientation.gamma).toBe(null);
    expect(result.current.orientation.isSupported).toBe(true);
  });

  it('should return normalized values', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    expect(result.current.normalized.x).toBe(0);
    expect(result.current.normalized.y).toBe(0);
  });

  it('should provide requestPermission function', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    expect(typeof result.current.requestPermission).toBe('function');
  });

  it('should update orientation when receiving events', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    // Simulate device orientation event
    if (orientationHandler) {
      act(() => {
        orientationHandler({
          alpha: 45,
          beta: 30,
          gamma: -20,
        } as DeviceOrientationEvent);
      });

      expect(result.current.orientation.alpha).toBe(45);
      expect(result.current.orientation.beta).toBe(30);
      expect(result.current.orientation.gamma).toBe(-20);
    }
  });

  it('should calculate normalized x value from gamma', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    if (orientationHandler) {
      // gamma of 45 should normalize to 0.5
      act(() => {
        orientationHandler({
          alpha: 0,
          beta: 0,
          gamma: 45,
        } as DeviceOrientationEvent);
      });

      expect(result.current.normalized.x).toBe(0.5);

      // gamma of -90 should normalize to -1
      act(() => {
        orientationHandler({
          alpha: 0,
          beta: 0,
          gamma: -90,
        } as DeviceOrientationEvent);
      });

      expect(result.current.normalized.x).toBe(-1);
    }
  });

  it('should calculate normalized y value from beta (clamped)', () => {
    const { result } = renderHook(() => useDeviceOrientation());

    if (orientationHandler) {
      // beta of 45 should clamp to 45 and normalize to 1
      act(() => {
        orientationHandler({
          alpha: 0,
          beta: 45,
          gamma: 0,
        } as DeviceOrientationEvent);
      });

      expect(result.current.normalized.y).toBe(1);

      // beta of -22.5 should normalize to -0.5
      act(() => {
        orientationHandler({
          alpha: 0,
          beta: -22.5,
          gamma: 0,
        } as DeviceOrientationEvent);
      });

      expect(result.current.normalized.y).toBe(-0.5);

      // beta values beyond 45 should be clamped
      act(() => {
        orientationHandler({
          alpha: 0,
          beta: 90,
          gamma: 0,
        } as DeviceOrientationEvent);
      });

      expect(result.current.normalized.y).toBe(1);
    }
  });

  it('should add event listener for deviceorientation', () => {
    renderHook(() => useDeviceOrientation());

    expect(window.addEventListener).toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function)
    );
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = renderHook(() => useDeviceOrientation());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'deviceorientation',
      expect.any(Function)
    );
  });
});

describe('useDeviceOrientation - permission API', () => {
  it('should handle permission request on iOS', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('granted');

    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: class MockDeviceOrientationEvent {
        static requestPermission = mockRequestPermission;
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceOrientation());

    let permissionResult: boolean = false;
    await act(async () => {
      permissionResult = await result.current.requestPermission();
    });

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(permissionResult).toBe(true);
    expect(result.current.orientation.hasPermission).toBe(true);
  });

  it('should handle denied permission', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('denied');

    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: class MockDeviceOrientationEvent {
        static requestPermission = mockRequestPermission;
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceOrientation());

    let permissionResult: boolean = true;
    await act(async () => {
      permissionResult = await result.current.requestPermission();
    });

    expect(permissionResult).toBe(false);
    expect(result.current.orientation.hasPermission).toBe(false);
  });
});

describe('useDeviceOrientation - unsupported', () => {
  it('should indicate when DeviceOrientationEvent is not supported', () => {
    // Remove DeviceOrientationEvent from window
    const originalDOE = window.DeviceOrientationEvent;
    // @ts-expect-error - intentionally removing property for test
    delete window.DeviceOrientationEvent;

    const { result } = renderHook(() => useDeviceOrientation());

    expect(result.current.orientation.isSupported).toBe(false);

    // Restore
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: originalDOE,
      writable: true,
      configurable: true,
    });
  });
});
