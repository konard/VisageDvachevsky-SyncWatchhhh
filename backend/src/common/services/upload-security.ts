/**
 * Upload Security Service
 * Validates file uploads with MIME type checking, magic bytes verification,
 * and bandwidth throttling
 */

import { logger } from '../../config/logger.js';
import { ValidationError } from '../errors/index.js';

/**
 * Allowed video MIME types
 */
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // MOV
  'video/x-matroska', // MKV
] as const;

/**
 * Magic bytes signatures for video formats
 * First few bytes of the file that identify the file type
 */
export const VIDEO_MAGIC_BYTES: Record<string, number[]> = {
  // MP4 and QuickTime - starts with ftyp box
  'video/mp4': [0x00, 0x00, 0x00, -1, 0x66, 0x74, 0x79, 0x70], // -1 means any byte
  'video/quicktime': [0x00, 0x00, 0x00, -1, 0x66, 0x74, 0x79, 0x70],

  // WebM - EBML header
  'video/webm': [0x1a, 0x45, 0xdf, 0xa3],

  // MKV - EBML header (same as WebM)
  'video/x-matroska': [0x1a, 0x45, 0xdf, 0xa3],
};

/**
 * Upload bandwidth limits (in bytes per second)
 */
export const UPLOAD_BANDWIDTH_LIMIT_BYTES_PER_SECOND = 50 * 1024 * 1024 / 8; // 50 Mbps = 6.25 MB/s

/**
 * Maximum upload size (8 GB)
 */
export const MAX_UPLOAD_SIZE = 8 * 1024 * 1024 * 1024;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  reason?: 'unsupported_format' | 'mime_mismatch' | 'too_large' | 'invalid_content';
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Upload Security Service
 */
export class UploadSecurityService {
  /**
   * Check if MIME type is supported
   */
  isSupportedMimeType(mimeType: string): boolean {
    return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as any);
  }

  /**
   * Verify magic bytes match the declared MIME type
   */
  verifyMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
    const expectedMagic = VIDEO_MAGIC_BYTES[declaredMimeType];

    if (!expectedMagic) {
      logger.warn(
        { mimeType: declaredMimeType },
        'No magic bytes signature defined for MIME type'
      );
      return true; // Allow if we don't have a signature
    }

    if (buffer.length < expectedMagic.length) {
      return false; // File too small to contain magic bytes
    }

    // Check each byte
    for (let i = 0; i < expectedMagic.length; i++) {
      const expected = expectedMagic[i];
      const actual = buffer[i];

      // -1 means "any byte is acceptable"
      if (expected === -1) continue;

      if (expected !== actual) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate file upload
   * Checks MIME type and verifies magic bytes
   */
  async validateUpload(
    buffer: Buffer,
    declaredMimeType: string,
    fileSize: number
  ): Promise<ValidationResult> {
    // 1. Check file size
    if (fileSize > MAX_UPLOAD_SIZE) {
      return {
        valid: false,
        reason: 'too_large',
        message: `File size exceeds maximum allowed size of 8GB`,
        details: { size: fileSize, maxSize: MAX_UPLOAD_SIZE },
      };
    }

    // 2. Check declared MIME type
    if (!this.isSupportedMimeType(declaredMimeType)) {
      return {
        valid: false,
        reason: 'unsupported_format',
        message: `Unsupported video format. Supported formats: MP4, WebM, MOV, MKV`,
        details: { mimeType: declaredMimeType },
      };
    }

    // 3. Verify magic bytes match declared type
    if (!this.verifyMagicBytes(buffer, declaredMimeType)) {
      logger.warn(
        {
          declaredMimeType,
          actualBytes: Array.from(buffer.slice(0, 16)),
        },
        'Magic bytes mismatch detected - possible file type spoofing'
      );

      return {
        valid: false,
        reason: 'mime_mismatch',
        message: `File content does not match declared type. This may indicate file type spoofing.`,
        details: {
          declaredMimeType,
          suggestion: 'Please ensure you are uploading a valid video file.',
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate file during upload (for streaming validation)
   */
  validateDuringUpload(
    mimeType: string,
    uploadedSize: number,
    maxSize: number = MAX_UPLOAD_SIZE
  ): void {
    // Check MIME type
    if (!this.isSupportedMimeType(mimeType)) {
      throw new ValidationError(
        `Unsupported video format. Supported formats: MP4, WebM, MOV, MKV`,
        { mimeType }
      );
    }

    // Check size during upload
    if (uploadedSize > maxSize) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of 8GB`,
        { uploadedSize, maxSize }
      );
    }
  }
}

/**
 * Bandwidth throttler for upload rate limiting per user
 */
export class UploadBandwidthThrottler {
  private userTokenBuckets = new Map<
    string,
    { tokens: number; lastRefill: number }
  >();

  /**
   * Tokens per second (bytes)
   */
  private readonly tokensPerSecond = UPLOAD_BANDWIDTH_LIMIT_BYTES_PER_SECOND;

  /**
   * Maximum burst size (10 MB)
   */
  private readonly maxBurst = 10 * 1024 * 1024;

  /**
   * Check if user can upload chunk
   * Implements token bucket algorithm
   */
  async canUpload(userId: string, chunkSize: number): Promise<boolean> {
    const now = Date.now();
    let bucket = this.userTokenBuckets.get(userId);

    if (!bucket) {
      // Initialize new bucket
      bucket = {
        tokens: this.maxBurst,
        lastRefill: now,
      };
      this.userTokenBuckets.set(userId, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const newTokens = elapsedSeconds * this.tokensPerSecond;
    bucket.tokens = Math.min(this.maxBurst, bucket.tokens + newTokens);
    bucket.lastRefill = now;

    // Check if enough tokens
    if (bucket.tokens >= chunkSize) {
      bucket.tokens -= chunkSize;
      return true;
    }

    // Not enough tokens - rate limited
    logger.debug(
      {
        userId,
        chunkSize,
        availableTokens: bucket.tokens,
        requiredTokens: chunkSize,
      },
      'Upload rate limit - insufficient tokens'
    );

    return false;
  }

  /**
   * Calculate wait time in milliseconds for next chunk
   */
  getWaitTime(userId: string, chunkSize: number): number {
    const bucket = this.userTokenBuckets.get(userId);
    if (!bucket) return 0;

    const deficit = chunkSize - bucket.tokens;
    if (deficit <= 0) return 0;

    return (deficit / this.tokensPerSecond) * 1000; // Convert to milliseconds
  }

  /**
   * Clear bucket for user (e.g., on upload completion)
   */
  clearBucket(userId: string): void {
    this.userTokenBuckets.delete(userId);
  }

  /**
   * Clean up old buckets (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [userId, bucket] of this.userTokenBuckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.userTokenBuckets.delete(userId);
      }
    }
  }
}

// Export singleton instances
export const uploadSecurityService = new UploadSecurityService();
export const uploadBandwidthThrottler = new UploadBandwidthThrottler();

// Cleanup old throttle buckets every hour
setInterval(() => {
  uploadBandwidthThrottler.cleanup();
}, 60 * 60 * 1000);
