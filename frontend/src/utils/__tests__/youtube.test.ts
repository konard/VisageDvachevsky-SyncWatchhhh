/**
 * Unit tests for YouTube utility functions
 */

import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoId, isValidYouTubeUrl, getYouTubeThumbnailUrl } from '../youtube';

describe('extractYouTubeVideoId', () => {
  it('should extract video ID from youtube.com/watch?v= URLs', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from youtu.be URLs', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from youtube.com/embed URLs', () => {
    const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from youtube.com/v URLs', () => {
    const url = 'https://www.youtube.com/v/dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from m.youtube.com URLs (mobile)', () => {
    const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should handle URLs with additional query parameters', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should handle URLs without www', () => {
    const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should handle URLs without protocol', () => {
    const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should return the video ID if already provided', () => {
    const videoId = 'dQw4w9WgXcQ';
    expect(extractYouTubeVideoId(videoId)).toBe('dQw4w9WgXcQ');
  });

  it('should return null for invalid URLs', () => {
    expect(extractYouTubeVideoId('https://example.com')).toBeNull();
    expect(extractYouTubeVideoId('not a url')).toBeNull();
    expect(extractYouTubeVideoId('')).toBeNull();
  });

  it('should return null for URLs with invalid video ID format', () => {
    expect(extractYouTubeVideoId('https://youtube.com/watch?v=invalid')).toBeNull();
    expect(extractYouTubeVideoId('https://youtube.com/watch?v=123')).toBeNull();
  });

  it('should handle URLs with trailing whitespace', () => {
    const url = '  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  it('should handle video IDs with hyphens and underscores', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgX-Q';
    expect(extractYouTubeVideoId(url)).toBe('dQw4w9WgX-Q');
  });
});

describe('isValidYouTubeUrl', () => {
  it('should return true for valid YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidYouTubeUrl('https://example.com')).toBe(false);
    expect(isValidYouTubeUrl('not a url')).toBe(false);
    expect(isValidYouTubeUrl('')).toBe(false);
  });

  it('should return true for direct video IDs', () => {
    expect(isValidYouTubeUrl('dQw4w9WgXcQ')).toBe(true);
  });
});

describe('getYouTubeThumbnailUrl', () => {
  it('should return default quality thumbnail URL', () => {
    const url = getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'default');
    expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg');
  });

  it('should return high quality thumbnail URL', () => {
    const url = getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'hq');
    expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('should return medium quality thumbnail URL', () => {
    const url = getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'mq');
    expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  });

  it('should return standard definition thumbnail URL', () => {
    const url = getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'sd');
    expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/sddefault.jpg');
  });

  it('should return max resolution thumbnail URL', () => {
    const url = getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'maxres');
    expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });

  it('should default to high quality if no quality specified', () => {
    const url = getYouTubeThumbnailUrl('dQw4w9WgXcQ');
    expect(url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
