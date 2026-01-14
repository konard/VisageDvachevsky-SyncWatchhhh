/**
 * HLSPlayer Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HLSPlayer } from '../HLSPlayer';
import Hls from 'hls.js';

// Mock hls.js
vi.mock('hls.js', () => {
  const mockHls = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
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

  it('should display error when HLS is not supported', async () => {
    (Hls as unknown as { isSupported: () => boolean }).isSupported = vi.fn(() => false);

    // Mock video element canPlayType to return empty string (no native HLS support)
    HTMLVideoElement.prototype.canPlayType = vi.fn(() => '');

    const onError = vi.fn();
    render(
      <HLSPlayer
        manifestUrl="https://example.com/manifest.m3u8"
        eventHandlers={{ onError }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Playback Error')).toBeTruthy();
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNSUPPORTED',
        fatal: true,
      })
    );
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

  it('should call onReady event handler', async () => {
    const onReady = vi.fn();
    render(
      <HLSPlayer
        manifestUrl="https://example.com/manifest.m3u8"
        eventHandlers={{ onReady }}
      />
    );

    // Simulate HLS initialization
    const hlsInstance = (Hls as unknown as { mock: { results: Array<{ value: unknown }> } }).mock.results[0].value as {
      on: { mock: { calls: Array<[string, (...args: unknown[]) => void]> } };
    };
    const manifestParsedHandler = hlsInstance.on.mock.calls.find(
      (call) => call[0] === Hls.Events.MANIFEST_PARSED
    )?.[1];

    if (manifestParsedHandler) {
      manifestParsedHandler(null, { levels: [] });
    }

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
  });
});
