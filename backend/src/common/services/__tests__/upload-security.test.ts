/**
 * Upload Security Service Tests
 */

import { describe, it, expect } from 'vitest';
import { UploadSecurityService } from '../upload-security.js';

describe('UploadSecurityService', () => {
  const service = new UploadSecurityService();

  describe('isSupportedMimeType', () => {
    it('should accept supported video MIME types', () => {
      expect(service.isSupportedMimeType('video/mp4')).toBe(true);
      expect(service.isSupportedMimeType('video/webm')).toBe(true);
      expect(service.isSupportedMimeType('video/quicktime')).toBe(true);
      expect(service.isSupportedMimeType('video/x-matroska')).toBe(true);
    });

    it('should reject unsupported MIME types', () => {
      expect(service.isSupportedMimeType('video/avi')).toBe(false);
      expect(service.isSupportedMimeType('image/jpeg')).toBe(false);
      expect(service.isSupportedMimeType('application/pdf')).toBe(false);
    });
  });

  describe('verifyMagicBytes', () => {
    it('should verify MP4 magic bytes correctly', () => {
      // MP4 file signature: 00 00 00 ?? 66 74 79 70
      const validMP4 = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
      expect(service.verifyMagicBytes(validMP4, 'video/mp4')).toBe(true);

      const invalidMP4 = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]); // JPEG signature
      expect(service.verifyMagicBytes(invalidMP4, 'video/mp4')).toBe(false);
    });

    it('should verify WebM magic bytes correctly', () => {
      // WebM file signature: 1A 45 DF A3
      const validWebM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00]);
      expect(service.verifyMagicBytes(validWebM, 'video/webm')).toBe(true);

      const invalidWebM = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]); // MP4 signature
      expect(service.verifyMagicBytes(invalidWebM, 'video/webm')).toBe(false);
    });

    it('should return false if buffer is too small', () => {
      const tooSmall = Buffer.from([0x1a, 0x45]); // Only 2 bytes
      expect(service.verifyMagicBytes(tooSmall, 'video/webm')).toBe(false);
    });
  });

  describe('validateUpload', () => {
    it('should accept valid MP4 upload', async () => {
      const validMP4 = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
      const result = await service.validateUpload(validMP4, 'video/mp4', 1024 * 1024); // 1 MB

      expect(result.valid).toBe(true);
    });

    it('should reject file that is too large', async () => {
      const validMP4 = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
      const result = await service.validateUpload(validMP4, 'video/mp4', 10 * 1024 * 1024 * 1024); // 10 GB

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('too_large');
    });

    it('should reject unsupported MIME type', async () => {
      const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = await service.validateUpload(buffer, 'image/jpeg', 1024);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('unsupported_format');
    });

    it('should reject MIME type mismatch (spoofing)', async () => {
      // JPEG magic bytes but declared as MP4
      const jpegBytes = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      const result = await service.validateUpload(jpegBytes, 'video/mp4', 1024);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('mime_mismatch');
    });
  });
});

describe('UploadBandwidthThrottler', () => {
  // Bandwidth throttler tests would require time-based testing
  // which is more complex. Skipping for now but would be good to add.
});
