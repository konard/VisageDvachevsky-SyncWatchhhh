import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGlassInteraction } from '../useGlassInteraction';

// Mock useReducedMotion
vi.mock('../useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('useGlassInteraction', () => {
  let mockElement: HTMLDivElement;
  let mockRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    mockElement = document.createElement('div');
    mockElement.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    mockRef = { current: mockElement };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    expect(result.current.state.isHovering).toBe(false);
    expect(result.current.state.isPressing).toBe(false);
    expect(result.current.state.pointerPosition).toBe(null);
    expect(result.current.state.scrollVelocity).toBe(0);
    expect(result.current.state.isDragging).toBe(false);
  });

  it('should return handlers object', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    expect(result.current.handlers).toHaveProperty('onPointerMove');
    expect(result.current.handlers).toHaveProperty('onPointerEnter');
    expect(result.current.handlers).toHaveProperty('onPointerLeave');
    expect(result.current.handlers).toHaveProperty('onPointerDown');
    expect(result.current.handlers).toHaveProperty('onPointerUp');
  });

  it('should generate CSS custom properties', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    expect(result.current.cssVars['--glass-hover']).toBe('0');
    expect(result.current.cssVars['--glass-press-depth']).toBe('0');
    expect(result.current.cssVars['--glass-pressing']).toBe('0');
    expect(result.current.cssVars['--glass-pointer-x']).toBe('50%');
    expect(result.current.cssVars['--glass-pointer-y']).toBe('50%');
  });

  it('should track pointer position on pointer enter', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    const mockEvent = {
      clientX: 50,
      clientY: 25,
    } as React.PointerEvent;

    act(() => {
      result.current.handlers.onPointerEnter(mockEvent);
    });

    expect(result.current.state.isHovering).toBe(true);
    expect(result.current.state.pointerPosition).toEqual({
      x: 50,
      y: 25,
      normalizedX: 0.25,
      normalizedY: 0.25,
    });
  });

  it('should update CSS variables on hover', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    const mockEvent = {
      clientX: 100,
      clientY: 50,
    } as React.PointerEvent;

    act(() => {
      result.current.handlers.onPointerEnter(mockEvent);
    });

    expect(result.current.cssVars['--glass-hover']).toBe('1');
    expect(result.current.cssVars['--glass-pointer-x']).toBe('100px');
    expect(result.current.cssVars['--glass-pointer-y']).toBe('50px');
  });

  it('should track pointer movement', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    // First enter
    act(() => {
      result.current.handlers.onPointerEnter({
        clientX: 0,
        clientY: 0,
      } as React.PointerEvent);
    });

    // Then move
    act(() => {
      result.current.handlers.onPointerMove({
        clientX: 150,
        clientY: 75,
      } as React.PointerEvent);
    });

    expect(result.current.state.pointerPosition).toEqual({
      x: 150,
      y: 75,
      normalizedX: 0.75,
      normalizedY: 0.75,
    });
  });

  it('should reset state on pointer leave', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    // Enter
    act(() => {
      result.current.handlers.onPointerEnter({
        clientX: 50,
        clientY: 25,
      } as React.PointerEvent);
    });

    // Press
    act(() => {
      result.current.handlers.onPointerDown({
        clientX: 50,
        clientY: 25,
      } as React.PointerEvent);
    });

    expect(result.current.state.isHovering).toBe(true);
    expect(result.current.state.isPressing).toBe(true);

    // Leave
    act(() => {
      result.current.handlers.onPointerLeave({} as React.PointerEvent);
    });

    expect(result.current.state.isHovering).toBe(false);
    expect(result.current.state.isPressing).toBe(false);
    expect(result.current.state.pointerPosition).toBe(null);
  });

  it('should track pressing state', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    act(() => {
      result.current.handlers.onPointerDown({
        clientX: 50,
        clientY: 25,
      } as React.PointerEvent);
    });

    expect(result.current.state.isPressing).toBe(true);
    expect(result.current.state.pressDepth).toBe(1);
    expect(result.current.cssVars['--glass-pressing']).toBe('1');
    expect(result.current.cssVars['--glass-press-depth']).toBe('1');

    act(() => {
      result.current.handlers.onPointerUp({} as React.PointerEvent);
    });

    expect(result.current.state.isPressing).toBe(false);
    expect(result.current.state.pressDepth).toBe(0);
  });

  it('should respect disabled pointer tracking option', () => {
    const { result } = renderHook(() =>
      useGlassInteraction(mockRef, { enablePointerTracking: false })
    );

    act(() => {
      result.current.handlers.onPointerEnter({
        clientX: 50,
        clientY: 25,
      } as React.PointerEvent);
    });

    // Should not track pointer position
    expect(result.current.state.isHovering).toBe(false);
    expect(result.current.state.pointerPosition).toBe(null);
  });

  it('should enable dragging when drag effect is enabled', () => {
    const { result } = renderHook(() =>
      useGlassInteraction(mockRef, { enableDragEffect: true })
    );

    act(() => {
      result.current.handlers.onPointerDown({
        clientX: 50,
        clientY: 25,
      } as React.PointerEvent);
    });

    expect(result.current.state.isDragging).toBe(true);
  });

  it('should not enable dragging when drag effect is disabled', () => {
    const { result } = renderHook(() =>
      useGlassInteraction(mockRef, { enableDragEffect: false })
    );

    act(() => {
      result.current.handlers.onPointerDown({
        clientX: 50,
        clientY: 25,
      } as React.PointerEvent);
    });

    expect(result.current.state.isDragging).toBe(false);
  });

  it('should return isReducedMotion flag', () => {
    const { result } = renderHook(() => useGlassInteraction(mockRef));

    expect(result.current.isReducedMotion).toBe(false);
  });
});

describe('useGlassInteraction with reduced motion', () => {
  it('should return empty CSS vars when reduced motion is preferred', async () => {
    // Need to dynamically import to get the updated mock
    const { useReducedMotion } = await import('../useReducedMotion');
    vi.mocked(useReducedMotion).mockReturnValue(true);

    const mockElement = document.createElement('div');
    const mockRef = { current: mockElement };

    const { result } = renderHook(() => useGlassInteraction(mockRef));

    // When reduced motion is true, cssVars should be empty
    expect(Object.keys(result.current.cssVars).length).toBe(0);
    expect(result.current.isReducedMotion).toBe(true);

    // Restore the mock for other tests
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });
});
