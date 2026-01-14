/**
 * Bull Queue Configuration
 * Message queue for video transcoding jobs
 */

import { Queue } from 'bullmq';
import { queueRedis } from './redis.js';
import { logger } from './logger.js';

export interface TranscodeJobData {
  videoId: string;
  inputKey: string;
  outputPrefix: string;
}

// Create transcode queue
export const transcodeQueue = new Queue<TranscodeJobData>('transcode', {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 100,
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

/**
 * Add a video to the transcoding queue
 */
export async function addTranscodeJob(
  videoId: string,
  inputKey: string,
  outputPrefix: string
): Promise<void> {
  try {
    await transcodeQueue.add(
      'transcode-video',
      {
        videoId,
        inputKey,
        outputPrefix,
      },
      {
        jobId: videoId, // Use videoId as job ID to prevent duplicates
      }
    );
    logger.info({ videoId, inputKey }, 'Added video to transcode queue');
  } catch (error) {
    logger.error(
      { error: (error as Error).message, videoId },
      'Failed to add video to transcode queue'
    );
    throw error;
  }
}

/**
 * Get job status from queue
 */
export async function getTranscodeJobStatus(videoId: string) {
  try {
    const job = await transcodeQueue.getJob(videoId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress as number;

    return {
      state,
      progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    };
  } catch (error) {
    logger.error(
      { error: (error as Error).message, videoId },
      'Failed to get transcode job status'
    );
    return null;
  }
}

/**
 * Close queue connection
 */
export async function closeQueue(): Promise<void> {
  await transcodeQueue.close();
  logger.info('Transcode queue closed');
}
