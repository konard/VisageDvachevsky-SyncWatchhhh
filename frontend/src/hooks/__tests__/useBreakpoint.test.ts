import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBreakpoint } from '../useBreakpoint';

describe('useBreakpoint', () => {
  let matchMediaSpy: any;

  const createMatchMedia = (matches: Record<string, boolean>) => {
    return (query: string) => {
      const match = matches[query] || false;
      return {
        matches: match,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      };
    };
  };

  beforeEach(() => {
    matchMediaSpy = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    });
  });

  it('should detect mobile breakpoint', () => {
    matchMediaSpy.mockImplementation(
      createMatchMedia({
        '(min-width: 640px)': false,
        '(min-width: 768px)': false,
        '(min-width: 1024px)': false,
        '(min-width: 1280px)': false,
      })
    );

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe('sm');
    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect tablet breakpoint', () => {
    matchMediaSpy.mockImplementation(
      createMatchMedia({
        '(min-width: 640px)': true,
        '(min-width: 768px)': true,
        '(min-width: 1024px)': false,
        '(min-width: 1280px)': false,
      })
    );

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe('md');
    expect(result.current.deviceType).toBe('tablet');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect desktop breakpoint', () => {
    matchMediaSpy.mockImplementation(
      createMatchMedia({
        '(min-width: 640px)': true,
        '(min-width: 768px)': true,
        '(min-width: 1024px)': true,
        '(min-width: 1280px)': false,
      })
    );

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe('lg');
    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should detect xl breakpoint', () => {
    matchMediaSpy.mockImplementation(
      createMatchMedia({
        '(min-width: 640px)': true,
        '(min-width: 768px)': true,
        '(min-width: 1024px)': true,
        '(min-width: 1280px)': true,
      })
    );

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe('xl');
    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
  });

  it('should check isAtLeast correctly', () => {
    matchMediaSpy.mockImplementation(
      createMatchMedia({
        '(min-width: 640px)': true,
        '(min-width: 768px)': true,
        '(min-width: 1024px)': false,
        '(min-width: 1280px)': false,
      })
    );

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isAtLeast('sm')).toBe(true);
    expect(result.current.isAtLeast('md')).toBe(true);
    expect(result.current.isAtLeast('lg')).toBe(false);
    expect(result.current.isAtLeast('xl')).toBe(false);
  });

  it('should check isAtMost correctly', () => {
    matchMediaSpy.mockImplementation(
      createMatchMedia({
        '(min-width: 640px)': true,
        '(min-width: 768px)': true,
        '(min-width: 1024px)': false,
        '(min-width: 1280px)': false,
      })
    );

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isAtMost('sm')).toBe(false);
    expect(result.current.isAtMost('md')).toBe(true);
    expect(result.current.isAtMost('lg')).toBe(true);
    expect(result.current.isAtMost('xl')).toBe(true);
  });
});
