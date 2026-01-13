import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { roomStateService } from '../../modules/room/state.service.js';
import { PlaybackState, RoomParticipant } from '../../websocket/types/events.js';

describe('RoomStateService', () => {
  const testRoomId = 'test-room-123';

  beforeEach(async () => {
    // Clear test data before each test
    await roomStateService.clearRoomState(testRoomId);
  });

  afterEach(async () => {
    // Clean up after each test
    await roomStateService.clearRoomState(testRoomId);
  });

  describe('Playback State', () => {
    it('should set and get playback state', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'dQw4w9WgXcQ',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 5000,
        sequenceNumber: 1,
      };

      await roomStateService.setPlaybackState(testRoomId, state);
      const retrieved = await roomStateService.getPlaybackState(testRoomId);

      expect(retrieved).toEqual(state);
    });

    it('should return null for non-existent playback state', async () => {
      const state = await roomStateService.getPlaybackState('non-existent-room');
      expect(state).toBeNull();
    });
  });

  describe('Participants', () => {
    it('should add and get participants', async () => {
      const participant: RoomParticipant = {
        id: 'participant-1',
        oderId: 'oder-123',
        userId: 'user-1',
        role: 'participant',
        canControl: false,
        joinedAt: new Date().toISOString(),
      };

      await roomStateService.addParticipant(testRoomId, participant);
      const participants = await roomStateService.getParticipants(testRoomId);

      expect(participants).toHaveLength(1);
      expect(participants[0]).toEqual(participant);
    });

    it('should not add duplicate participants', async () => {
      const participant: RoomParticipant = {
        id: 'participant-1',
        oderId: 'oder-123',
        userId: 'user-1',
        role: 'participant',
        canControl: false,
        joinedAt: new Date().toISOString(),
      };

      await roomStateService.addParticipant(testRoomId, participant);
      await roomStateService.addParticipant(testRoomId, participant);

      const participants = await roomStateService.getParticipants(testRoomId);
      expect(participants).toHaveLength(1);
    });

    it('should remove participant', async () => {
      const participant: RoomParticipant = {
        id: 'participant-1',
        oderId: 'oder-123',
        userId: 'user-1',
        role: 'participant',
        canControl: false,
        joinedAt: new Date().toISOString(),
      };

      await roomStateService.addParticipant(testRoomId, participant);
      await roomStateService.removeParticipant(testRoomId, participant.oderId);

      const participants = await roomStateService.getParticipants(testRoomId);
      expect(participants).toHaveLength(0);
    });

    it('should return empty array for non-existent room', async () => {
      const participants = await roomStateService.getParticipants('non-existent-room');
      expect(participants).toEqual([]);
    });
  });

  describe('Online Sockets', () => {
    it('should track online sockets', async () => {
      await roomStateService.addOnlineSocket(testRoomId, 'socket-1');
      await roomStateService.addOnlineSocket(testRoomId, 'socket-2');

      const count = await roomStateService.getOnlineCount(testRoomId);
      expect(count).toBe(2);
    });

    it('should remove online socket', async () => {
      await roomStateService.addOnlineSocket(testRoomId, 'socket-1');
      await roomStateService.addOnlineSocket(testRoomId, 'socket-2');
      await roomStateService.removeOnlineSocket(testRoomId, 'socket-1');

      const count = await roomStateService.getOnlineCount(testRoomId);
      expect(count).toBe(1);
    });

    it('should return 0 for non-existent room', async () => {
      const count = await roomStateService.getOnlineCount('non-existent-room');
      expect(count).toBe(0);
    });
  });

  describe('Clear Room State', () => {
    it('should clear all room state', async () => {
      const state: PlaybackState = {
        roomId: testRoomId,
        sourceType: 'youtube',
        sourceId: 'test',
        isPlaying: true,
        playbackRate: 1.0,
        anchorServerTimeMs: Date.now(),
        anchorMediaTimeMs: 0,
        sequenceNumber: 1,
      };

      const participant: RoomParticipant = {
        id: 'participant-1',
        oderId: 'oder-123',
        userId: 'user-1',
        role: 'participant',
        canControl: false,
        joinedAt: new Date().toISOString(),
      };

      await roomStateService.setPlaybackState(testRoomId, state);
      await roomStateService.addParticipant(testRoomId, participant);
      await roomStateService.addOnlineSocket(testRoomId, 'socket-1');

      await roomStateService.clearRoomState(testRoomId);

      const playback = await roomStateService.getPlaybackState(testRoomId);
      const participants = await roomStateService.getParticipants(testRoomId);
      const count = await roomStateService.getOnlineCount(testRoomId);

      expect(playback).toBeNull();
      expect(participants).toEqual([]);
      expect(count).toBe(0);
    });
  });
});
