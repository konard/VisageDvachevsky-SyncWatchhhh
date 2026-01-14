import { z } from 'zod';

/**
 * Supported video MIME types
 */
export const SUPPORTED_VIDEO_MIMES = [
  'video/mp4',
  'video/x-matroska', // MKV
  'video/avi',
  'video/x-msvideo',
  'video/quicktime', // MOV
  'video/x-ms-wmv', // WMV
  'video/x-flv', // FLV
  'video/webm',
] as const;

/**
 * File size limits
 */
export const MAX_FILE_SIZE = 8 * 1024 * 1024 * 1024; // 8GB in bytes
export const MAX_VIDEO_DURATION = 3 * 60 * 60; // 3 hours in seconds

/**
 * Rate limit configuration
 */
export const UPLOAD_RATE_LIMIT = {
  max: 3, // 3 uploads
  timeWindow: 60 * 60 * 1000, // 1 hour in milliseconds
} as const;

/**
 * Video status enum
 */
export const VideoStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type VideoStatusType = typeof VideoStatus[keyof typeof VideoStatus];

/**
 * Validation helper to check if MIME type is supported
 */
export function isSupportedVideoMime(mimeType: string): boolean {
  return SUPPORTED_VIDEO_MIMES.includes(
    mimeType as typeof SUPPORTED_VIDEO_MIMES[number]
  );
}

/**
 * Schema for video upload response
 */
export const videoUploadResponseSchema = z.object({
  videoId: z.string(),
  status: z.enum([VideoStatus.PENDING, VideoStatus.PROCESSING, VideoStatus.READY, VideoStatus.FAILED]),
  progress: z.number().min(0).max(100),
});

export type VideoUploadResponse = z.infer<typeof videoUploadResponseSchema>;

/**
 * Schema for video status response
 */
export const videoStatusResponseSchema = z.object({
  videoId: z.string(),
  status: z.enum([VideoStatus.PENDING, VideoStatus.PROCESSING, VideoStatus.READY, VideoStatus.FAILED]),
  progress: z.number().min(0).max(100),
  filename: z.string(),
  originalSize: z.number(),
  mimeType: z.string(),
  duration: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  manifestUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
});

export type VideoStatusResponse = z.infer<typeof videoStatusResponseSchema>;
