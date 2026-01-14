/**
 * Health Check HTTP Server for Transcoder Worker
 *
 * Provides health endpoints for Kubernetes probes and monitoring
 */

import http from 'http';
import { logger } from './logger.js';
import { Worker, Queue } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TranscoderHealth {
  healthy: boolean;
  activeJobs: number;
  queueDepth: number;
  ffmpegAvailable: boolean;
  cpuUsagePercent: number;
  memoryUsageMB: number;
  lastJobCompletedAt?: string;
  lastJobFailedAt?: string;
}

let transcoderWorker: Worker | null = null;
let transcoderQueue: Queue | null = null;
let lastJobCompleted: Date | null = null;
let lastJobFailed: Date | null = null;

export function setTranscoderWorker(worker: Worker) {
  transcoderWorker = worker;
}

export function setTranscoderQueue(queue: Queue) {
  transcoderQueue = queue;
}

export function setLastJobCompleted(date: Date) {
  lastJobCompleted = date;
}

export function setLastJobFailed(date: Date) {
  lastJobFailed = date;
}

async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

function getCpuUsage(): number {
  const cpus = process.cpuUsage();
  const total = cpus.user + cpus.system;
  // Convert microseconds to percentage (rough estimate)
  return Math.min(100, (total / 1000000) * 100);
}

function getMemoryUsageMB(): number {
  const memUsage = process.memoryUsage();
  return Math.round(memUsage.heapUsed / 1024 / 1024);
}

async function getTranscoderHealth(): Promise<TranscoderHealth> {
  const ffmpegAvailable = await checkFFmpegAvailable();

  let activeJobs = 0;
  let queueDepth = 0;

  if (transcoderQueue) {
    try {
      activeJobs = await transcoderQueue.getActiveCount();
      queueDepth = await transcoderQueue.getWaitingCount();
    } catch (error) {
      logger.warn({ error: (error as Error).message }, 'Failed to get queue metrics');
    }
  }

  const MAX_CONCURRENT_JOBS = parseInt(process.env.WORKER_CONCURRENCY || '1');
  const healthy = ffmpegAvailable && activeJobs <= MAX_CONCURRENT_JOBS;

  return {
    healthy,
    activeJobs,
    queueDepth,
    ffmpegAvailable,
    cpuUsagePercent: getCpuUsage(),
    memoryUsageMB: getMemoryUsageMB(),
    lastJobCompletedAt: lastJobCompleted?.toISOString(),
    lastJobFailedAt: lastJobFailed?.toISOString(),
  };
}

export function createHealthServer(port: number = 3001): http.Server {
  const server = http.createServer(async (req, res) => {
    // Enable CORS for health checks
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // Liveness probe - simple check that process is running
    if (req.url === '/health/live') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // Readiness probe - check if worker can process jobs
    if (req.url === '/health/ready') {
      try {
        const health = await getTranscoderHealth();
        const statusCode = health.healthy ? 200 : 503;

        res.writeHead(statusCode);
        res.end(JSON.stringify({
          status: health.healthy ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          ...health,
        }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({
          status: 'error',
          error: (error as Error).message,
        }));
      }
      return;
    }

    // Detailed transcoder health endpoint
    if (req.url === '/health/transcoder') {
      try {
        const health = await getTranscoderHealth();
        res.writeHead(200);
        res.end(JSON.stringify(health));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({
          healthy: false,
          error: (error as Error).message,
        }));
      }
      return;
    }

    // Default 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    logger.info({ port }, 'Health check server started');
  });

  return server;
}
