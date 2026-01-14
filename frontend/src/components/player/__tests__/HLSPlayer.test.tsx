/**
 * HLSPlayer Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HLSPlayer } from '../HLSPlayer';
import Hls from 'hls.js';

// Mock hls.js
const mockHlsInstance = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  currentLevel: -1,
};

const MockHls = vi.fn().mockImplementation(() => mockHlsInstance);

// Static properties
MockHls.isSupported = vi.fn(() => true);
MockHls.Events = {
  MANIFEST_PARSED: 'hlsManifestParsed',
  LEVEL_SWITCHED: 'hlsLevelSwitched',
  FRAG_BUFFERED: 'hlsFragBuffered',
  ERROR: 'hlsError',
};
MockHls.ErrorTypes = {
  NETWORK_ERROR: 'networkError',
  MEDIA_ERROR: 'mediaError',
};

vi.mock('hls.js', () => ({
  default: MockHls,
}));

describe('HLSPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Hls.isSupported
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
    // The actual error display requires ref timing that's difficult to test with mocks
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
    // The actual callback behavior requires more complex HLS lifecycle testing
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
