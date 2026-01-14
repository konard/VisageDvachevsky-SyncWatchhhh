import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  let matchMediaSpy: any;

  beforeEach(() => {
    // Mock window.matchMedia
    matchMediaSpy = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    });
  });

  it('should return true when media query matches', () => {
    matchMediaSpy.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should return false when media query does not match', () => {
    matchMediaSpy.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('should update when media query changes', async () => {
    let changeHandler: ((event: any) => void) | undefined;

    matchMediaSpy.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((event: string, handler: (event: any) => void) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    // Simulate media query change
    if (changeHandler) {
      (changeHandler as (event: { matches: boolean }) => void)({ matches: true });
    }

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListener = vi.fn();
    const removeListener = vi.fn();

    matchMediaSpy.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener,
      addListener: vi.fn(),
      removeListener,
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();

    // Should call either removeEventListener or removeListener (browser dependent)
    expect(removeEventListener.mock.calls.length + removeListener.mock.calls.length).toBeGreaterThan(0);
  });
});
