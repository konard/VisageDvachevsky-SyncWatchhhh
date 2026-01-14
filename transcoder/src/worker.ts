/**
 * Transcoding Worker
 *
 * Processes video upload jobs from the queue using FFmpeg
 * Outputs HLS segments to MinIO storage
 */

import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import { Client as MinioClient } from 'minio';
import { Redis } from 'ioredis';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger.js';
import { prisma, closePrisma } from './db.js';

interface TranscodeJob {
  videoId: string;
  inputKey: string;
  outputPrefix: string;
}

interface VideoMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
}

interface BitrateVariant {
  name: string;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
  maxrate: string;
  bufsize: string;
}

// Initialize Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize MinIO client
const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'syncwatch',
  secretKey: process.env.MINIO_SECRET_KEY || 'syncwatch_dev',
});

const TEMP_DIR = '/tmp/transcode';
const INPUT_BUCKET = 'videos';
const OUTPUT_BUCKET = 'hls';

async function ensureTempDir(): Promise<void> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

async function downloadFromMinio(bucket: string, key: string, localPath: string): Promise<void> {
  await minio.fGetObject(bucket, key, localPath);
}

async function uploadToMinio(bucket: string, key: string, localPath: string): Promise<void> {
  await minio.fPutObject(bucket, key, localPath);
}

async function uploadDirectory(bucket: string, prefix: string, localDir: string): Promise<void> {
  const files = await fs.readdir(localDir);

  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remotePath = `${prefix}/${file}`;
    await uploadToMinio(bucket, remotePath, localPath);
    logger.debug({ file: remotePath }, 'Uploaded segment');
  }
}

async function cleanupTemp(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    logger.warn({ dir }, 'Failed to cleanup temp directory');
  }
}

async function updateProgress(videoId: string, progress: number): Promise<void> {
  await Promise.all([
    redis.set(`video:${videoId}:progress`, progress),
    prisma.video.update({
      where: { id: videoId },
      data: { progress },
    }),
  ]);
}

async function updateVideoStatus(
  videoId: string,
  status: 'pending' | 'processing' | 'ready' | 'failed',
  data?: {
    manifestUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    errorMessage?: string;
  }
): Promise<void> {
  await prisma.video.update({
    where: { id: videoId },
    data: {
      status,
      ...data,
    },
  });
  logger.info({ videoId, status, data }, 'Video status updated');
}

/**
 * Probe video file for metadata
 */
async function probeVideo(inputPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        logger.error({ error: err.message }, 'Failed to probe video');
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const duration = metadata.format.duration || null;
      const width = videoStream?.width || null;
      const height = videoStream?.height || null;

      logger.info({ duration, width, height }, 'Video metadata probed');

      resolve({
        duration: duration ? Math.round(duration) : null,
        width,
        height,
      });
    });
  });
}

/**
 * Get adaptive bitrate variants based on input resolution
 */
function getVariants(sourceHeight: number | null): BitrateVariant[] {
  const allVariants: BitrateVariant[] = [
    {
      name: '720p',
      height: 720,
      videoBitrate: '2800k',
      audioBitrate: '128k',
      maxrate: '3000k',
      bufsize: '6000k',
    },
    {
      name: '480p',
      height: 480,
      videoBitrate: '1400k',
      audioBitrate: '128k',
      maxrate: '1500k',
      bufsize: '3000k',
    },
    {
      name: '360p',
      height: 360,
      videoBitrate: '800k',
      audioBitrate: '96k',
      maxrate: '900k',
      bufsize: '1800k',
    },
  ];

  // Only include variants smaller than or equal to source resolution
  if (!sourceHeight) {
    return allVariants;
  }

  return allVariants.filter(variant => variant.height <= sourceHeight);
}

/**
 * Generate master playlist for adaptive bitrate streaming
 */
async function generateMasterPlaylist(
  outputDir: string,
  variants: BitrateVariant[]
): Promise<void> {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3', ''];

  for (const variant of variants) {
    const bandwidth = parseInt(variant.videoBitrate) * 1000 + parseInt(variant.audioBitrate) * 1000;
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${Math.round(variant.height * 16 / 9)}x${variant.height}`);
    lines.push(`${variant.name}/playlist.m3u8`);
    lines.push('');
  }

  await fs.writeFile(path.join(outputDir, 'master.m3u8'), lines.join('\n'));
  logger.info('Master playlist generated');
}

/**
 * Transcode a single variant
 */
async function transcodeVariant(
  inputPath: string,
  outputDir: string,
  variant: BitrateVariant,
  onProgress?: (percent: number) => void
): Promise<void> {
  const variantDir = path.join(outputDir, variant.name);
  await fs.mkdir(variantDir, { recursive: true });

  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        // Video settings
        '-c:v libx264',
        '-preset fast',
        '-profile:v main',
        '-level 4.0',
        `-b:v ${variant.videoBitrate}`,
        `-maxrate ${variant.maxrate}`,
        `-bufsize ${variant.bufsize}`,
        `-vf scale=-2:${variant.height}`,
        // Audio settings
        '-c:a aac',
        `-b:a ${variant.audioBitrate}`,
        '-ac 2',
        // HLS settings
        '-f hls',
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_segment_filename', path.join(variantDir, 'segment_%03d.ts'),
        '-hls_playlist_type vod',
      ])
      .output(path.join(variantDir, 'playlist.m3u8'))
      .on('start', (cmd) => {
        logger.debug({ cmd, variant: variant.name }, 'FFmpeg command');
      })
      .on('progress', (progress) => {
        if (progress.percent && onProgress) {
          onProgress(progress.percent);
        }
      })
      .on('end', () => {
        logger.info({ variant: variant.name }, 'Variant transcoding completed');
        resolve();
      })
      .on('error', (err) => {
        logger.error({ error: err.message, variant: variant.name }, 'Variant transcoding failed');
        reject(err);
      })
      .run();
  });
}

async function transcodeVideo(job: Job<TranscodeJob>): Promise<VideoMetadata & { manifestUrl: string }> {
  const { videoId, inputKey, outputPrefix } = job.data;

  logger.info({ videoId, inputKey }, 'Starting transcoding job');

  const workDir = path.join(TEMP_DIR, videoId);
  const inputPath = path.join(workDir, 'input');
  const outputDir = path.join(workDir, 'output');

  try {
    // Update status to processing
    await updateVideoStatus(videoId, 'processing');

    // Create work directories
    await fs.mkdir(workDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    // Download input file from MinIO (0-10%)
    logger.info({ inputKey }, 'Downloading input file');
    await downloadFromMinio(INPUT_BUCKET, inputKey, inputPath);
    await updateProgress(videoId, 10);

    // Probe video for metadata (10-15%)
    logger.info('Probing video metadata');
    const metadata = await probeVideo(inputPath);
    await updateProgress(videoId, 15);

    // Determine which variants to generate
    const variants = getVariants(metadata.height);
    logger.info({ variants: variants.map(v => v.name), sourceHeight: metadata.height }, 'Generating variants');

    // Transcode each variant (15-85%)
    const progressPerVariant = 70 / variants.length;
    let currentProgress = 15;

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      logger.info({ variant: variant.name, progress: `${i + 1}/${variants.length}` }, 'Starting variant transcoding');

      await transcodeVariant(inputPath, outputDir, variant, (percent) => {
        const variantProgress = currentProgress + (percent / 100) * progressPerVariant;
        const roundedProgress = Math.round(variantProgress);
        updateProgress(videoId, roundedProgress);
        job.updateProgress(roundedProgress);
        logger.debug({ variant: variant.name, percent }, 'Variant progress');
      });

      currentProgress += progressPerVariant;
      await updateProgress(videoId, Math.round(currentProgress));
    }

    await updateProgress(videoId, 85);

    // Generate master playlist
    logger.info('Generating master playlist');
    await generateMasterPlaylist(outputDir, variants);
    await updateProgress(videoId, 90);

    // Upload HLS segments to MinIO (90-100%)
    logger.info('Uploading HLS segments to storage');
    await uploadDirectory(OUTPUT_BUCKET, outputPrefix, outputDir);

    await updateProgress(videoId, 100);

    // Return manifest URL and metadata
    const manifestUrl = `${outputPrefix}/master.m3u8`;
    logger.info({ videoId, manifestUrl, metadata }, 'Transcoding job completed');

    // Update Video record with final status and metadata
    await updateVideoStatus(videoId, 'ready', {
      manifestUrl,
      duration: metadata.duration || undefined,
      width: metadata.width || undefined,
      height: metadata.height || undefined,
    });

    return {
      ...metadata,
      manifestUrl,
    };

  } catch (error) {
    // Handle transcoding errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ videoId, error: errorMessage }, 'Transcoding failed');

    // Update Video record with failed status
    await updateVideoStatus(videoId, 'failed', {
      errorMessage,
    });

    // Re-throw to mark job as failed
    throw error;

  } finally {
    // Cleanup
    await cleanupTemp(workDir);
  }
}

async function main(): Promise<void> {
  await ensureTempDir();

  logger.info('Starting transcoding worker');

  // Timeout for transcoding jobs (2 hours)
  const TRANSCODE_TIMEOUT = 2 * 60 * 60 * 1000;

  const worker = new Worker<TranscodeJob>('transcode', transcodeVideo, {
    connection: redis,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1'), // Process one video at a time by default
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
    settings: {
      // Retry failed jobs with exponential backoff
      backoffStrategy: (attemptsMade: number) => {
        // Retry after 1min, 5min, 15min
        const delays = [60000, 300000, 900000];
        return delays[attemptsMade - 1] || 900000;
      },
    },
  });

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, videoId: job.data.videoId, result }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({
      jobId: job?.id,
      videoId: job?.data.videoId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, 'Worker error');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully');
    await worker.close();
    await closePrisma();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.fatal({ error: err.message }, 'Worker startup failed');
  process.exit(1);
});
