/**
 * Video Service
 * Handles video upload, validation, storage, and transcoding queue management
 */

import { MultipartFile } from '@fastify/multipart';
import { nanoid } from 'nanoid';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { unlink, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { prisma } from '../../common/utils/prisma.js';
import { minioClient, BUCKETS } from '../../config/minio.js';
import { addTranscodeJob } from '../../config/queue.js';
import { logger } from '../../config/logger.js';
import { stateRedis } from '../../config/redis.js';
import {
  NotFoundError,
  ValidationError,
  TooManyRequestsError,
} from '../../common/errors/index.js';
import {
  uploadSecurityService,
} from '../../common/services/upload-security.js';
import { auditLogger } from '../../common/services/audit-logger.js';
import {
  MAX_FILE_SIZE,
  VideoStatus,
  UPLOAD_RATE_LIMIT,
  type VideoUploadResponse,
  type VideoStatusResponse,
  type VideoStatusType,
} from './schemas.js';

export class VideoService {
  /**
   * Check user's upload rate limit
   */
  async checkUploadRateLimit(userId: string): Promise<void> {
    const key = `upload-limit:${userId}`;
    const now = Date.now();
    const windowStart = now - UPLOAD_RATE_LIMIT.timeWindow;

    // Get all upload timestamps for this user
    const uploads = await stateRedis.zrangebyscore(key, windowStart, now);

    if (uploads.length >= UPLOAD_RATE_LIMIT.max) {
      // Get the oldest upload timestamp
      const oldestUpload = parseInt(uploads[0], 10);
      const retryAfter = Math.ceil((oldestUpload + UPLOAD_RATE_LIMIT.timeWindow - now) / 1000);

      throw new TooManyRequestsError(
        `Upload rate limit exceeded. You can upload ${UPLOAD_RATE_LIMIT.max} videos per hour. Please try again in ${retryAfter} seconds.`
      );
    }
  }

  /**
   * Record upload for rate limiting
   */
  async recordUpload(userId: string): Promise<void> {
    const key = `upload-limit:${userId}`;
    const now = Date.now();
    const windowStart = now - UPLOAD_RATE_LIMIT.timeWindow;

    // Add current upload timestamp
    await stateRedis.zadd(key, now, now.toString());

    // Remove old entries outside the time window
    await stateRedis.zremrangebyscore(key, '-inf', windowStart);

    // Set expiration to cleanup old keys
    await stateRedis.expire(key, Math.ceil(UPLOAD_RATE_LIMIT.timeWindow / 1000));
  }

  /**
   * Validate video file with enhanced security checks
   */
  validateVideoFile(file: MultipartFile, ip: string): void {
    // Use security service for validation
    uploadSecurityService.validateDuringUpload(
      file.mimetype,
      file.file.readableLength || 0,
      MAX_FILE_SIZE
    );

    // Check file size (if available from headers)
    if (file.file.readableLength && file.file.readableLength > MAX_FILE_SIZE) {
      // Log security event
      auditLogger.log({
        eventType: 'security.upload_rejected',
        actorIp: ip,
        targetType: 'video',
        targetId: 'unknown',
        metadata: {
          reason: 'file_too_large',
          size: file.file.readableLength,
          maxSize: MAX_FILE_SIZE,
        },
        success: false,
      });

      throw new ValidationError(
        `File size exceeds maximum allowed size of 8GB`,
        { size: file.file.readableLength }
      );
    }
  }

  /**
   * Generate unique storage key for video
   */
  generateStorageKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const randomId = nanoid(12);
    const ext = filename.split('.').pop() || 'mp4';
    return `${userId}/${timestamp}-${randomId}.${ext}`;
  }

  /**
   * Upload file to MinIO via temporary file
   * Returns the file size
   */
  async uploadToMinio(
    file: MultipartFile,
    storageKey: string,
    ip: string
  ): Promise<number> {
    // Create temporary file path
    const tempFilePath = join(tmpdir(), `upload-${nanoid(12)}`);

    try {
      // Stream file to temporary location and track size
      let uploadedSize = 0;
      const writeStream = createWriteStream(tempFilePath);
      const firstChunk: Buffer[] = [];
      let firstChunkCollected = false;

      // Track upload size and collect first chunk for magic bytes verification
      file.file.on('data', (chunk: Buffer) => {
        uploadedSize += chunk.length;

        // Collect first 16 bytes for magic bytes verification
        if (!firstChunkCollected && firstChunk.length === 0) {
          firstChunk.push(chunk.slice(0, 16));
          if (firstChunk[0].length >= 16) {
            firstChunkCollected = true;
          }
        }

        if (uploadedSize > MAX_FILE_SIZE) {
          file.file.destroy(new Error('File size exceeds 8GB limit'));
          writeStream.destroy();
        }
      });

      // Write to temp file
      await pipeline(file.file, writeStream);

      // Check final file size
      const stats = await stat(tempFilePath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new ValidationError('File size exceeds maximum allowed size of 8GB', {
          size: stats.size,
        });
      }

      // Verify magic bytes if we collected the first chunk
      if (firstChunk.length > 0 && firstChunk[0].length >= 8) {
        const validationResult = await uploadSecurityService.validateUpload(
          firstChunk[0],
          file.mimetype,
          stats.size
        );

        if (!validationResult.valid) {
          // Log security event
          await auditLogger.log({
            eventType: 'security.upload_rejected',
            actorIp: ip,
            targetType: 'video',
            targetId: storageKey,
            metadata: {
              reason: validationResult.reason,
              message: validationResult.message,
              mimeType: file.mimetype,
            },
            success: false,
          });

          throw new ValidationError(
            validationResult.message || 'Upload validation failed',
            validationResult.details
          );
        }
      }

      // Upload to MinIO
      await minioClient.fPutObject(BUCKETS.VIDEOS, storageKey, tempFilePath, {
        'Content-Type': file.mimetype,
      });

      logger.info({ storageKey, size: stats.size }, 'File uploaded to MinIO');

      return stats.size;
    } catch (error) {
      logger.error(
        { error: (error as Error).message, storageKey },
        'Failed to upload file to MinIO'
      );
      throw error;
    } finally {
      // Cleanup temporary file
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Create video record in database
   */
  async createVideoRecord(
    userId: string,
    filename: string,
    mimeType: string,
    size: number,
    storageKey: string
  ): Promise<string> {
    // Create video expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const video = await prisma.video.create({
      data: {
        uploaderId: userId,
        filename,
        originalSize: BigInt(size),
        mimeType,
        storageKey,
        status: VideoStatus.PENDING,
        progress: 0,
        expiresAt,
      },
    });

    logger.info({ videoId: video.id, userId }, 'Video record created');

    return video.id;
  }

  /**
   * Upload video file
   */
  async uploadVideo(
    userId: string,
    file: MultipartFile,
    ip: string = 'unknown'
  ): Promise<VideoUploadResponse> {
    // Check rate limit
    await this.checkUploadRateLimit(userId);

    // Validate file
    this.validateVideoFile(file, ip);

    const filename = file.filename;

    // Generate storage key
    const storageKey = this.generateStorageKey(userId, filename);

    // Upload to MinIO with security validation
    const fileSize = await this.uploadToMinio(file, storageKey, ip);

    // Create database record
    const videoId = await this.createVideoRecord(
      userId,
      filename,
      file.mimetype,
      fileSize,
      storageKey
    );

    // Add to transcoding queue
    const outputPrefix = `${videoId}`;
    await addTranscodeJob(videoId, storageKey, outputPrefix);

    // Record upload for rate limiting
    await this.recordUpload(userId);

    logger.info({ videoId, userId, filename }, 'Video upload completed');

    return {
      videoId,
      status: VideoStatus.PENDING,
      progress: 0,
    };
  }

  /**
   * Get video status
   */
  async getVideoStatus(videoId: string, userId: string): Promise<VideoStatusResponse> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundError('Video');
    }

    // Check if user owns this video
    if (video.uploaderId !== userId) {
      throw new NotFoundError('Video');
    }

    // Get real-time progress from Redis if processing
    let progress = video.progress;
    if (video.status === VideoStatus.PROCESSING || video.status === VideoStatus.PENDING) {
      const redisProgress = await stateRedis.get(`video:${videoId}:progress`);
      if (redisProgress) {
        progress = parseInt(redisProgress, 10);
      }
    }

    return {
      videoId: video.id,
      status: video.status as VideoStatusType,
      progress,
      filename: video.filename,
      originalSize: Number(video.originalSize),
      mimeType: video.mimeType,
      duration: video.duration,
      width: video.width,
      height: video.height,
      manifestUrl: video.manifestUrl,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt.toISOString(),
    };
  }
}
