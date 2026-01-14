/**
 * useHLSPlayer Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHLSPlayer } from '../useHLSPlayer';
import Hls from 'hls.js';

// Mock hls.js
vi.mock('hls.js', () => {
  const mockHls = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn(),
    currentLevel: -1,
    Events: {
      MANIFEST_PARSED: 'hlsManifestParsed',
      LEVEL_SWITCHED: 'hlsLevelSwitched',
      FRAG_BUFFERED: 'hlsFragBuffered',
      ERROR: 'hlsError',
    },
    ErrorTypes: {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
    },
  };

  return {
    default: vi.fn(() => mockHls),
    __esModule: true,
  };
});

describe('useHLSPlayer', () => {
  let mockVideoElement: HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();
    (Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => true);

    // Create mock video element
    mockVideoElement = document.createElement('video');
    mockVideoElement.play = vi.fn(() => Promise.resolve());
    mockVideoElement.pause = vi.fn();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    expect(result.current.state).toBe('loading');
  });

  it('should provide player controls', () => {
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    expect(result.current.controls).toBeDefined();
    expect(typeof result.current.controls.play).toBe('function');
    expect(typeof result.current.controls.pause).toBe('function');
    expect(typeof result.current.controls.seek).toBe('function');
    expect(typeof result.current.controls.setPlaybackRate).toBe('function');
    expect(typeof result.current.controls.getCurrentTime).toBe('function');
    expect(typeof result.current.controls.getDuration).toBe('function');
    expect(typeof result.current.controls.isPlaying).toBe('function');
    expect(typeof result.current.controls.getState).toBe('function');
    expect(typeof result.current.controls.destroy).toBe('function');
  });

  it('should call play on video element when controls.play is called', () => {
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    result.current.controls.play();
    expect(mockVideoElement.play).toHaveBeenCalled();
  });

  it('should call pause on video element when controls.pause is called', () => {
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    result.current.controls.pause();
    expect(mockVideoElement.pause).toHaveBeenCalled();
  });

  it('should seek to specific time', () => {
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    result.current.controls.seek(30);
    expect(mockVideoElement.currentTime).toBe(30);
  });

  it('should set playback rate', () => {
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    result.current.controls.setPlaybackRate(1.5);
    expect(mockVideoElement.playbackRate).toBe(1.5);
  });

  it('should get current time', () => {
    mockVideoElement.currentTime = 45;

    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    expect(result.current.controls.getCurrentTime()).toBe(45);
  });

  it('should get duration', () => {
    // Mock duration using Object.defineProperty since it's read-only
    Object.defineProperty(mockVideoElement, 'duration', {
      value: 120,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    expect(result.current.controls.getDuration()).toBe(120);
  });

  it('should handle error when HLS is not supported', () => {
    (Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => false);
    mockVideoElement.canPlayType = vi.fn(() => '');

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
        eventHandlers: { onError },
      })
    );

    expect(result.current.state).toBe('error');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNSUPPORTED',
        fatal: true,
      })
    );
  });

  it('should use native HLS on Safari', () => {
    (Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => false);
    mockVideoElement.canPlayType = vi.fn(() => 'probably');

    const manifestUrl = 'https://example.com/manifest.m3u8';
    renderHook(() =>
      useHLSPlayer({
        manifestUrl,
        videoElement: mockVideoElement,
      })
    );

    expect(mockVideoElement.src).toBe(manifestUrl);
  });

  it('should destroy HLS instance on cleanup', () => {
    const { unmount } = renderHook(() =>
      useHLSPlayer({
        manifestUrl: 'https://example.com/manifest.m3u8',
        videoElement: mockVideoElement,
      })
    );

    const hlsInstance = (Hls as unknown as { mock: { results: Array<{ value: { destroy: () => void } }> } }).mock.results[0].value;
    unmount();

    expect(hlsInstance.destroy).toHaveBeenCalled();
  });
});
