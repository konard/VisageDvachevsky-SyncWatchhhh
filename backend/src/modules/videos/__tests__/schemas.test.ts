/**
 * Video Schema Tests
 */

import { describe, it, expect } from 'vitest';
import { isSupportedVideoMime, SUPPORTED_VIDEO_MIMES, MAX_FILE_SIZE } from '../schemas.js';

describe('Video Schemas', () => {
  describe('isSupportedVideoMime', () => {
    it('should accept supported video MIME types', () => {
      expect(isSupportedVideoMime('video/mp4')).toBe(true);
      expect(isSupportedVideoMime('video/x-matroska')).toBe(true);
      expect(isSupportedVideoMime('video/webm')).toBe(true);
      expect(isSupportedVideoMime('video/quicktime')).toBe(true);
    });

    it('should reject unsupported MIME types', () => {
      expect(isSupportedVideoMime('video/unknown')).toBe(false);
      expect(isSupportedVideoMime('image/png')).toBe(false);
      expect(isSupportedVideoMime('application/pdf')).toBe(false);
      expect(isSupportedVideoMime('text/plain')).toBe(false);
    });

    it('should reject empty or invalid strings', () => {
      expect(isSupportedVideoMime('')).toBe(false);
      expect(isSupportedVideoMime('invalid')).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct max file size (8GB)', () => {
      expect(MAX_FILE_SIZE).toBe(8 * 1024 * 1024 * 1024);
    });

    it('should have at least 7 supported video formats', () => {
      expect(SUPPORTED_VIDEO_MIMES.length).toBeGreaterThanOrEqual(7);
    });
  });
});
