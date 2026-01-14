/**
 * FFmpeg Process Resource Limits
 *
 * Implements resource constraints for FFmpeg processes to prevent:
 * - Runaway CPU usage
 * - Excessive memory consumption
 * - Stuck/hanging processes
 */

import { ChildProcess } from 'child_process';
import { logger } from './logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FFmpegResourceLimits {
  maxMemoryMB: number;          // Kill if memory exceeds this
  timeoutMinutes: number;       // Max job duration
  niceLevel: number;            // Process priority (0-19, higher = lower priority)
  progressTimeoutMs: number;    // Kill if no progress for this long
}

export const DEFAULT_FFMPEG_LIMITS: FFmpegResourceLimits = {
  maxMemoryMB: 4096,            // 4GB max memory
  timeoutMinutes: 120,          // 2 hours max (for 3-hour videos)
  niceLevel: 10,                // Lower priority than system processes
  progressTimeoutMs: 120000,    // 2 minutes without progress = stuck
};

interface ProcessMemoryInfo {
  rss: number;  // Resident Set Size in bytes
  vms: number;  // Virtual Memory Size in bytes
}

/**
 * Get memory usage for a specific process
 */
async function getProcessMemory(pid: number): Promise<ProcessMemoryInfo | null> {
  try {
    // Use ps command to get memory info
    const { stdout } = await execAsync(`ps -p ${pid} -o rss=,vsz=`);
    const [rss, vms] = stdout.trim().split(/\s+/).map(Number);

    // ps returns KB, convert to bytes
    return {
      rss: rss * 1024,
      vms: vms * 1024,
    };
  } catch {
    // Process may have exited
    return null;
  }
}

/**
 * Monitor FFmpeg process and enforce resource limits
 */
export class FFmpegProcessMonitor {
  private memoryWatcher?: NodeJS.Timeout;
  private timeoutTimer?: NodeJS.Timeout;
  private progressWatcher?: NodeJS.Timeout;
  private lastProgressTime: number = Date.now();
  private lastProgressPercent: number = 0;

  constructor(
    private process: ChildProcess,
    private limits: FFmpegResourceLimits,
    private onKilled?: (reason: string) => void
  ) {}

  /**
   * Start monitoring the process
   */
  start(): void {
    if (!this.process.pid) {
      logger.warn('Cannot monitor process without PID');
      return;
    }

    // Monitor memory usage every 5 seconds
    this.memoryWatcher = setInterval(async () => {
      await this.checkMemory();
    }, 5000);

    // Set overall timeout
    this.timeoutTimer = setTimeout(() => {
      this.killProcess('timeout', `Process exceeded ${this.limits.timeoutMinutes} minutes`);
    }, this.limits.timeoutMinutes * 60 * 1000);

    // Monitor progress (check for stalled processes)
    this.progressWatcher = setInterval(() => {
      this.checkProgress();
    }, 10000); // Check every 10 seconds

    logger.info(
      {
        pid: this.process.pid,
        limits: this.limits,
      },
      'FFmpeg process monitoring started'
    );
  }

  /**
   * Update progress (call this from FFmpeg progress callback)
   */
  updateProgress(percent: number): void {
    if (percent > this.lastProgressPercent) {
      this.lastProgressPercent = percent;
      this.lastProgressTime = Date.now();
    }
  }

  /**
   * Check if process is making progress
   */
  private checkProgress(): void {
    const elapsed = Date.now() - this.lastProgressTime;

    if (elapsed > this.limits.progressTimeoutMs) {
      this.killProcess(
        'stalled',
        `No progress for ${Math.round(elapsed / 1000)}s (last: ${this.lastProgressPercent}%)`
      );
    }
  }

  /**
   * Check memory usage and kill if exceeded
   */
  private async checkMemory(): Promise<void> {
    if (!this.process.pid) return;

    const memInfo = await getProcessMemory(this.process.pid);
    if (!memInfo) return;

    const memoryMB = Math.round(memInfo.rss / 1024 / 1024);

    if (memoryMB > this.limits.maxMemoryMB) {
      this.killProcess(
        'memory_limit',
        `Process exceeded memory limit: ${memoryMB}MB > ${this.limits.maxMemoryMB}MB`
      );
    }
  }

  /**
   * Kill the FFmpeg process
   */
  private killProcess(reason: string, message: string): void {
    if (!this.process.pid) return;

    logger.warn(
      {
        pid: this.process.pid,
        reason,
        message,
      },
      'Killing FFmpeg process due to resource limit'
    );

    // Try graceful termination first
    this.process.kill('SIGTERM');

    // Force kill after 10 seconds if still running
    setTimeout(() => {
      if (this.process.pid && !this.process.killed) {
        logger.error({ pid: this.process.pid }, 'Force killing FFmpeg process');
        this.process.kill('SIGKILL');
      }
    }, 10000);

    this.stop();

    if (this.onKilled) {
      this.onKilled(message);
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.memoryWatcher) {
      clearInterval(this.memoryWatcher);
      this.memoryWatcher = undefined;
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }

    if (this.progressWatcher) {
      clearInterval(this.progressWatcher);
      this.progressWatcher = undefined;
    }
  }
}

/**
 * Apply nice level to lower process priority
 * This is best-effort and may fail if permissions are insufficient
 */
export async function applyNiceLevel(pid: number, niceLevel: number): Promise<void> {
  try {
    await execAsync(`renice -n ${niceLevel} -p ${pid}`);
    logger.debug({ pid, niceLevel }, 'Applied nice level to process');
  } catch (error) {
    logger.warn(
      {
        pid,
        niceLevel,
        error: (error as Error).message,
      },
      'Failed to apply nice level (may require elevated permissions)'
    );
  }
}
