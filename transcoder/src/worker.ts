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
import { pino } from 'pino';
import path from 'path';
import fs from 'fs/promises';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

interface TranscodeJob {
  videoId: string;
  inputKey: string;
  outputPrefix: string;
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

function updateProgress(videoId: string, progress: number): Promise<number> {
  return redis.set(`video:${videoId}:progress`, progress);
}

async function transcodeVideo(job: Job<TranscodeJob>): Promise<string> {
  const { videoId, inputKey, outputPrefix } = job.data;

  logger.info({ videoId, inputKey }, 'Starting transcoding job');

  const workDir = path.join(TEMP_DIR, videoId);
  const inputPath = path.join(workDir, 'input');
  const outputDir = path.join(workDir, 'output');

  try {
    // Create work directories
    await fs.mkdir(workDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    // Download input file from MinIO
    logger.info({ inputKey }, 'Downloading input file');
    await downloadFromMinio(INPUT_BUCKET, inputKey, inputPath);
    await updateProgress(videoId, 10);

    // Transcode to HLS
    logger.info('Starting FFmpeg transcoding');
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          // Video settings - adaptive bitrate
          '-c:v libx264',
          '-preset fast',
          '-crf 22',
          '-maxrate 3000k',
          '-bufsize 6000k',
          // Audio settings
          '-c:a aac',
          '-b:a 128k',
          '-ac 2',
          // HLS settings
          '-f hls',
          '-hls_time 6',
          '-hls_list_size 0',
          '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
          '-hls_playlist_type vod',
        ])
        .output(path.join(outputDir, 'playlist.m3u8'))
        .on('start', (cmd) => {
          logger.debug({ cmd }, 'FFmpeg command');
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            // Map FFmpeg progress (0-100) to our range (10-90)
            const scaledProgress = Math.round(10 + (progress.percent * 0.8));
            updateProgress(videoId, scaledProgress);
            job.updateProgress(scaledProgress);
            logger.debug({ percent: progress.percent }, 'Transcoding progress');
          }
        })
        .on('end', () => {
          logger.info('FFmpeg transcoding completed');
          resolve();
        })
        .on('error', (err) => {
          logger.error({ error: err.message }, 'FFmpeg transcoding failed');
          reject(err);
        })
        .run();
    });

    await updateProgress(videoId, 90);

    // Upload HLS segments to MinIO
    logger.info('Uploading HLS segments to storage');
    await uploadDirectory(OUTPUT_BUCKET, outputPrefix, outputDir);

    await updateProgress(videoId, 100);

    // Return manifest URL
    const manifestUrl = `${outputPrefix}/playlist.m3u8`;
    logger.info({ videoId, manifestUrl }, 'Transcoding job completed');

    return manifestUrl;

  } finally {
    // Cleanup
    await cleanupTemp(workDir);
  }
}

async function main(): Promise<void> {
  await ensureTempDir();

  logger.info('Starting transcoding worker');

  const worker = new Worker<TranscodeJob>('transcode', transcodeVideo, {
    connection: redis,
    concurrency: 1, // Process one video at a time
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, videoId: job.data.videoId, result }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, videoId: job?.data.videoId, error: err.message }, 'Job failed');
  });

  worker.on('error', (err) => {
    logger.error({ error: err.message }, 'Worker error');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down');
    await worker.close();
    await redis.quit();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down');
    await worker.close();
    await redis.quit();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.fatal({ error: err.message }, 'Worker startup failed');
  process.exit(1);
});
