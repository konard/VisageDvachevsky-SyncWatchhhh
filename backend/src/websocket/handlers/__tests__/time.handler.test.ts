import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleTimePing } from '../time.handler.js';
import { ServerEvents } from '../../types/events.js';

// Mock logger
vi.mock('../../../config/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Time Handler', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-id',
      emit: vi.fn(),
      data: {
        sessionId: 'test-session',
      },
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('handleTimePing', () => {
    it('should respond with time:pong event', () => {
      const clientTime = Date.now();
      const data = { clientTime };

      handleTimePing(mockSocket, data);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        ServerEvents.TIME_PONG,
        expect.objectContaining({
          clientTime,
          serverTime: expect.any(Number),
        })
      );
    });

    it('should include both client and server times in response', () => {
      const clientTime = 1234567890;
      const data = { clientTime };

      const beforeTime = Date.now();
      handleTimePing(mockSocket, data);
      const afterTime = Date.now();

      expect(mockSocket.emit).toHaveBeenCalledTimes(1);

      const call = mockSocket.emit.mock.calls[0];
      expect(call[0]).toBe(ServerEvents.TIME_PONG);
      expect(call[1]).toMatchObject({
        clientTime: 1234567890,
        serverTime: expect.any(Number),
      });

      // Server time should be between beforeTime and afterTime
      const serverTime = call[1].serverTime;
      expect(serverTime).toBeGreaterThanOrEqual(beforeTime);
      expect(serverTime).toBeLessThanOrEqual(afterTime);
    });

    it('should handle invalid data gracefully', () => {
      const invalidData = { clientTime: 'not-a-number' };

      // Should not throw
      expect(() => {
        handleTimePing(mockSocket, invalidData as any);
      }).not.toThrow();

      // Should not emit on invalid data
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle missing clientTime', () => {
      const invalidData = {};

      // Should not throw
      expect(() => {
        handleTimePing(mockSocket, invalidData as any);
      }).not.toThrow();

      // Should not emit on invalid data
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle multiple pings from same socket', () => {
      const clientTime1 = Date.now();
      const clientTime2 = Date.now() + 100;

      handleTimePing(mockSocket, { clientTime: clientTime1 });
      handleTimePing(mockSocket, { clientTime: clientTime2 });

      expect(mockSocket.emit).toHaveBeenCalledTimes(2);

      const call1 = mockSocket.emit.mock.calls[0];
      const call2 = mockSocket.emit.mock.calls[1];

      expect(call1[1].clientTime).toBe(clientTime1);
      expect(call2[1].clientTime).toBe(clientTime2);
    });

    it('should provide accurate server time', () => {
      const clientTime = Date.now();

      const beforeServerTime = Date.now();
      handleTimePing(mockSocket, { clientTime });
      const afterServerTime = Date.now();

      const call = mockSocket.emit.mock.calls[0];
      const serverTime = call[1].serverTime;

      // Server time should be very close to current time
      expect(serverTime).toBeGreaterThanOrEqual(beforeServerTime);
      expect(serverTime).toBeLessThanOrEqual(afterServerTime);
      expect(serverTime - beforeServerTime).toBeLessThan(100); // Should be within 100ms
    });
  });
});
