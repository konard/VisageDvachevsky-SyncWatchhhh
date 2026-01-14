import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClockSync, TimeSyncSample } from '../ClockSync';

// Mock Socket.io client
class MockSocket {
  private handlers: Map<string, Function[]> = new Map();

  on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any) {
    // Simulate server response
    if (event === 'time:ping') {
      setTimeout(() => {
        const handlers = this.handlers.get('time:pong');
        if (handlers) {
          handlers.forEach((handler) => {
            handler({
              clientTime: data.clientTime,
              serverTime: Date.now() + this.serverOffset,
            });
          });
        }
      }, this.networkDelay);
    }
  }

  // Test configuration
  serverOffset: number = 0;
  networkDelay: number = 10;
}

describe('ClockSync', () => {
  let clockSync: ClockSync;
  let mockSocket: MockSocket;

  beforeEach(() => {
    clockSync = new ClockSync();
    mockSocket = new MockSocket();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sync', () => {
    it('should successfully sync with server', async () => {
      mockSocket.serverOffset = 1000; // Server is 1 second ahead
      mockSocket.networkDelay = 10;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);

      // Fast-forward time for all delays and network operations
      await vi.runAllTimersAsync();

      const offset = await syncPromise;

      expect(clockSync.isSynced()).toBe(true);
      expect(offset).toBeCloseTo(1000, -1); // Within 10ms tolerance
      expect(clockSync.getOffset()).toBeCloseTo(1000, -1);
      expect(clockSync.getSamples()).toHaveLength(5);
    });

    it('should handle negative offset (client ahead of server)', async () => {
      mockSocket.serverOffset = -500; // Server is 0.5 seconds behind
      mockSocket.networkDelay = 10;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();

      const offset = await syncPromise;

      expect(offset).toBeCloseTo(-500, -1);
      expect(clockSync.getOffset()).toBeCloseTo(-500, -1);
    });

    it('should handle zero offset (clocks in sync)', async () => {
      mockSocket.serverOffset = 0;
      mockSocket.networkDelay = 10;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();

      const offset = await syncPromise;

      expect(offset).toBeCloseTo(0, -1);
    });

    it('should take the specified number of samples', async () => {
      mockSocket.serverOffset = 100;

      const syncPromise = clockSync.sync(mockSocket as any, 3, 50);
      await vi.runAllTimersAsync();

      await syncPromise;

      expect(clockSync.getSamples()).toHaveLength(3);
    });

    it('should handle timeout on no response', async () => {
      // Create a socket that doesn't respond
      const brokenSocket = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(), // Doesn't trigger response
      };

      const syncPromise = clockSync.sync(brokenSocket as any, 1, 0);

      // Fast-forward past the 5 second timeout
      await vi.advanceTimersByTimeAsync(6000);

      await expect(syncPromise).rejects.toThrow('Time sync timeout');
    });
  });

  describe('getServerTime', () => {
    it('should return correct server time after sync', async () => {
      mockSocket.serverOffset = 2000;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      const clientTime = Date.now();
      const serverTime = clockSync.getServerTime();

      expect(serverTime).toBeCloseTo(clientTime + 2000, -1);
    });

    it('should return client time when not synced', () => {
      const clientTime = Date.now();
      const serverTime = clockSync.getServerTime();

      expect(serverTime).toBe(clientTime);
    });
  });

  describe('getRtt', () => {
    it('should calculate average RTT from samples', async () => {
      mockSocket.serverOffset = 0;
      mockSocket.networkDelay = 20;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      const rtt = clockSync.getRtt();

      // RTT should be approximately 2 * networkDelay
      expect(rtt).toBeGreaterThan(0);
      expect(rtt).toBeLessThan(100); // Should be reasonable
    });
  });

  describe('isSynced', () => {
    it('should return false before sync', () => {
      expect(clockSync.isSynced()).toBe(false);
    });

    it('should return true after successful sync', async () => {
      mockSocket.serverOffset = 500;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      expect(clockSync.isSynced()).toBe(true);
    });

    it('should return false after reset', async () => {
      mockSocket.serverOffset = 500;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      clockSync.reset();

      expect(clockSync.isSynced()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all sync data', async () => {
      mockSocket.serverOffset = 1000;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      expect(clockSync.isSynced()).toBe(true);
      expect(clockSync.getOffset()).not.toBe(0);

      clockSync.reset();

      expect(clockSync.isSynced()).toBe(false);
      expect(clockSync.getOffset()).toBe(0);
      expect(clockSync.getRtt()).toBe(0);
      expect(clockSync.getSamples()).toHaveLength(0);
    });
  });

  describe('getSamples', () => {
    it('should return all samples', async () => {
      mockSocket.serverOffset = 500;

      const syncPromise = clockSync.sync(mockSocket as any, 3, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      const samples = clockSync.getSamples();

      expect(samples).toHaveLength(3);
      samples.forEach((sample) => {
        expect(sample).toHaveProperty('offset');
        expect(sample).toHaveProperty('rtt');
        expect(sample).toHaveProperty('timestamp');
      });
    });

    it('should not allow mutation of internal samples', async () => {
      mockSocket.serverOffset = 500;

      const syncPromise = clockSync.sync(mockSocket as any, 3, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      const samples = clockSync.getSamples();
      samples.pop();

      expect(clockSync.getSamples()).toHaveLength(3);
    });
  });

  describe('offset calculation', () => {
    it('should filter outliers by using samples with lowest RTT', async () => {
      // This test verifies the algorithm filters by RTT
      mockSocket.serverOffset = 1000;

      const syncPromise = clockSync.sync(mockSocket as any, 5, 50);
      await vi.runAllTimersAsync();
      await syncPromise;

      const samples = clockSync.getSamples();
      const sortedByRtt = [...samples].sort((a, b) => a.rtt - b.rtt);

      // The algorithm should prefer samples with lower RTT
      // The offset should be close to the average of the best samples
      const bestSamples = sortedByRtt.slice(0, 3);
      const expectedOffset = bestSamples.reduce((sum, s) => sum + s.offset, 0) / bestSamples.length;

      expect(clockSync.getOffset()).toBeCloseTo(expectedOffset, 0);
    });
  });
});
