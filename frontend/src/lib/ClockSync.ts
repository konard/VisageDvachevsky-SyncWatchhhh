import { Socket } from 'socket.io-client';

/**
 * Sample data structure for time synchronization measurements
 */
export interface TimeSyncSample {
  offset: number;
  rtt: number;
  timestamp: number;
}

/**
 * ClockSync class for NTP-like clock synchronization
 *
 * This class implements a Network Time Protocol (NTP)-like algorithm
 * to synchronize the client's clock with the server's clock.
 *
 * It performs multiple ping-pong measurements, filters outliers,
 * and calculates a clock offset that can be used to convert
 * local client time to server time.
 */
export class ClockSync {
  private samples: TimeSyncSample[] = [];
  private offset: number = 0;
  private averageRtt: number = 0;
  private synced: boolean = false;

  /**
   * Perform clock synchronization
   *
   * Takes multiple samples (default 5) to calculate the clock offset
   * between the client and server.
   *
   * @param socket - Socket.io client socket
   * @param sampleCount - Number of samples to take (default: 5)
   * @param delayMs - Delay between samples in milliseconds (default: 100)
   * @returns Promise that resolves to the calculated offset
   */
  async sync(socket: Socket, sampleCount: number = 5, delayMs: number = 100): Promise<number> {
    this.samples = [];
    this.synced = false;

    // Take multiple samples
    for (let i = 0; i < sampleCount; i++) {
      const sample = await this.takeSample(socket);
      this.samples.push(sample);

      // Add delay between samples (except after the last one)
      if (i < sampleCount - 1) {
        await this.delay(delayMs);
      }
    }

    // Calculate offset from samples
    this.offset = this.calculateOffset();
    this.averageRtt = this.calculateAverageRtt();
    this.synced = true;

    return this.offset;
  }

  /**
   * Take a single time sync sample
   *
   * Sends a ping to the server and measures the round-trip time
   * and calculates the clock offset.
   *
   * @param socket - Socket.io client socket
   * @returns Promise that resolves to a time sync sample
   */
  private takeSample(socket: Socket): Promise<TimeSyncSample> {
    return new Promise((resolve, reject) => {
      const clientTimeSent = Date.now();
      let resolved = false;

      // Set a timeout in case the server doesn't respond
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.off('time:pong', handler);
          reject(new Error('Time sync timeout'));
        }
      }, 5000);

      const handler = (data: { clientTime: number; serverTime: number }) => {
        if (resolved) return;

        // Check if this pong is for our ping
        if (data.clientTime === clientTimeSent) {
          resolved = true;
          clearTimeout(timeout);
          socket.off('time:pong', handler);

          const clientTimeReceived = Date.now();

          // Calculate round-trip time
          const rtt = clientTimeReceived - clientTimeSent;

          // Estimate server time at the moment we received the pong
          // Assume symmetric network delay (half RTT each way)
          const serverTimeNow = data.serverTime + rtt / 2;

          // Calculate clock offset (how much to add to client time to get server time)
          const offset = serverTimeNow - clientTimeReceived;

          resolve({
            offset,
            rtt,
            timestamp: clientTimeReceived,
          });
        }
      };

      socket.on('time:pong', handler);
      socket.emit('time:ping', { clientTime: clientTimeSent });
    });
  }

  /**
   * Calculate the final offset from all samples
   *
   * Uses a simple algorithm:
   * 1. Sort samples by RTT (lower RTT = more reliable)
   * 2. Take the best samples (lowest RTT)
   * 3. Average their offsets
   *
   * @returns The calculated clock offset in milliseconds
   */
  private calculateOffset(): number {
    if (this.samples.length === 0) {
      return 0;
    }

    // Sort by RTT (ascending)
    const sorted = [...this.samples].sort((a, b) => a.rtt - b.rtt);

    // Take the best half of samples (minimum 3, maximum all)
    const bestCount = Math.max(3, Math.ceil(sorted.length / 2));
    const best = sorted.slice(0, Math.min(bestCount, sorted.length));

    // Calculate average offset
    const sum = best.reduce((acc, sample) => acc + sample.offset, 0);
    return sum / best.length;
  }

  /**
   * Calculate average RTT from all samples
   *
   * @returns The average round-trip time in milliseconds
   */
  private calculateAverageRtt(): number {
    if (this.samples.length === 0) {
      return 0;
    }

    const sum = this.samples.reduce((acc, sample) => acc + sample.rtt, 0);
    return sum / this.samples.length;
  }

  /**
   * Delay helper function
   *
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the current server time
   *
   * Converts the current client time to server time using the
   * calculated offset.
   *
   * @returns The current server time in milliseconds since epoch
   */
  getServerTime(): number {
    return Date.now() + this.offset;
  }

  /**
   * Get the clock offset
   *
   * @returns The clock offset in milliseconds
   */
  getOffset(): number {
    return this.offset;
  }

  /**
   * Get the average round-trip time
   *
   * @returns The average RTT in milliseconds
   */
  getRtt(): number {
    return this.averageRtt;
  }

  /**
   * Check if the clock is synced
   *
   * @returns True if the clock has been synced, false otherwise
   */
  isSynced(): boolean {
    return this.synced;
  }

  /**
   * Get all samples
   *
   * @returns Array of all time sync samples
   */
  getSamples(): TimeSyncSample[] {
    return [...this.samples];
  }

  /**
   * Reset the clock sync state
   */
  reset(): void {
    this.samples = [];
    this.offset = 0;
    this.averageRtt = 0;
    this.synced = false;
  }
}
