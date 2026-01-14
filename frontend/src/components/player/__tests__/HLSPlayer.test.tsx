/**
 * HLSPlayer Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HLSPlayer } from '../HLSPlayer';
import Hls from 'hls.js';

// Mock hls.js - all mock setup must be inside the factory function
// because vi.mock is hoisted and runs before any module-level variables
vi.mock('hls.js', () => {
  const mockHlsInstance = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    currentLevel: -1,
  };

  // Create a constructor function that returns the mock instance
  function MockHlsConstructor() {
    return mockHlsInstance;
  }

  // Add static properties
  MockHlsConstructor.isSupported = vi.fn(() => true);
  MockHlsConstructor.Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    LEVEL_SWITCHED: 'hlsLevelSwitched',
    FRAG_BUFFERED: 'hlsFragBuffered',
    ERROR: 'hlsError',
  };
  MockHlsConstructor.ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  };

  return {
    default: MockHlsConstructor,
  };
});

describe('HLSPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure isSupported returns true by default
    (Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render video element', () => {
    render(<HLSPlayer manifestUrl="https://example.com/manifest.m3u8" />);
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
  });

  it('should show loading state initially', () => {
    render(<HLSPlayer manifestUrl="https://example.com/manifest.m3u8" />);
    expect(screen.getByText('Loading video...')).toBeTruthy();
  });

  it('should handle unsupported HLS gracefully', () => {
    // Test that component renders without crashing when HLS is not supported
    (Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => false);
    HTMLVideoElement.prototype.canPlayType = vi.fn(() => '');

    // Component should render without throwing
    expect(() => {
      render(
        <HLSPlayer
          manifestUrl="https://example.com/manifest.m3u8"
          eventHandlers={{ onError: vi.fn() }}
        />
      );
    }).not.toThrow();

    // Video element should still be present
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
  });

  it('should apply custom className', () => {
    render(
      <HLSPlayer
        manifestUrl="https://example.com/manifest.m3u8"
        className="custom-class"
      />
    );
    const container = document.querySelector('.hls-player-container');
    expect(container?.classList.contains('custom-class')).toBe(true);
  });

  it('should set muted attribute when muted prop is true', () => {
    render(<HLSPlayer manifestUrl="https://example.com/manifest.m3u8" muted />);
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.muted).toBe(true);
  });

  it('should show controls when controls prop is true', () => {
    render(<HLSPlayer manifestUrl="https://example.com/manifest.m3u8" controls />);
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.controls).toBe(true);
  });

  it('should hide controls when controls prop is false', () => {
    render(
      <HLSPlayer manifestUrl="https://example.com/manifest.m3u8" controls={false} />
    );
    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video.controls).toBe(false);
  });

  it('should accept event handlers prop', () => {
    // Test that eventHandlers prop is accepted without errors
    const onReady = vi.fn();
    const onError = vi.fn();
    const onPlay = vi.fn();

    expect(() => {
      render(
        <HLSPlayer
          manifestUrl="https://example.com/manifest.m3u8"
          eventHandlers={{ onReady, onError, onPlay }}
        />
      );
    }).not.toThrow();

    // Verify video element was created
    const video = document.querySelector('video');
    expect(video).toBeTruthy();
  });
});
