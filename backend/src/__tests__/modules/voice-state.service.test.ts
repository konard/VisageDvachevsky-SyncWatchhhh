import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { voiceStateService } from '../../modules/voice/state.service.js';

describe('VoiceStateService', () => {
  const testRoomId = 'test-room-voice-123';

  beforeEach(async () => {
    // Clear test data before each test
    await voiceStateService.clearVoiceState(testRoomId);
  });

  afterEach(async () => {
    // Clean up after each test
    await voiceStateService.clearVoiceState(testRoomId);
  });

  describe('Voice Participants', () => {
    it('should add and get voice participants', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      const participants = await voiceStateService.getVoiceParticipants(testRoomId);

      expect(participants).toHaveLength(1);
      expect(participants[0].oderId).toBe('oder-123');
      expect(participants[0].isSpeaking).toBe(false);
      expect(participants[0].joinedAt).toBeDefined();
    });

    it('should not add duplicate voice participants', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');

      const participants = await voiceStateService.getVoiceParticipants(testRoomId);
      expect(participants).toHaveLength(1);
    });

    it('should remove voice participant', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.removeVoiceParticipant(testRoomId, 'oder-123');

      const participants = await voiceStateService.getVoiceParticipants(testRoomId);
      expect(participants).toHaveLength(0);
    });

    it('should return empty array for non-existent room', async () => {
      const participants = await voiceStateService.getVoiceParticipants('non-existent-room');
      expect(participants).toEqual([]);
    });

    it('should get specific voice participant by oderId', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-456');

      const participant = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-123');
      expect(participant).toBeDefined();
      expect(participant?.oderId).toBe('oder-123');
    });

    it('should return null for non-existent voice participant', async () => {
      const participant = await voiceStateService.getVoiceParticipant(
        testRoomId,
        'non-existent-oder'
      );
      expect(participant).toBeNull();
    });
  });

  describe('Speaking Status', () => {
    it('should update speaking status', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.updateSpeakingStatus(testRoomId, 'oder-123', true);

      const participant = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-123');
      expect(participant?.isSpeaking).toBe(true);
    });

    it('should toggle speaking status multiple times', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');

      await voiceStateService.updateSpeakingStatus(testRoomId, 'oder-123', true);
      let participant = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-123');
      expect(participant?.isSpeaking).toBe(true);

      await voiceStateService.updateSpeakingStatus(testRoomId, 'oder-123', false);
      participant = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-123');
      expect(participant?.isSpeaking).toBe(false);
    });

    it('should not affect other participants when updating speaking status', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-456');

      await voiceStateService.updateSpeakingStatus(testRoomId, 'oder-123', true);

      const participant1 = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-123');
      const participant2 = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-456');

      expect(participant1?.isSpeaking).toBe(true);
      expect(participant2?.isSpeaking).toBe(false);
    });
  });

  describe('Voice Status Checks', () => {
    it('should check if participant is in voice', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');

      const isInVoice = await voiceStateService.isInVoice(testRoomId, 'oder-123');
      expect(isInVoice).toBe(true);
    });

    it('should return false for participant not in voice', async () => {
      const isInVoice = await voiceStateService.isInVoice(testRoomId, 'oder-999');
      expect(isInVoice).toBe(false);
    });

    it('should get all voice peer IDs', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-456');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-789');

      const peerIds = await voiceStateService.getVoicePeerIds(testRoomId);
      expect(peerIds).toHaveLength(3);
      expect(peerIds).toContain('oder-123');
      expect(peerIds).toContain('oder-456');
      expect(peerIds).toContain('oder-789');
    });

    it('should return empty array for room with no voice participants', async () => {
      const peerIds = await voiceStateService.getVoicePeerIds(testRoomId);
      expect(peerIds).toEqual([]);
    });
  });

  describe('Clear Voice State', () => {
    it('should clear all voice state for a room', async () => {
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-123');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-456');
      await voiceStateService.updateSpeakingStatus(testRoomId, 'oder-123', true);

      await voiceStateService.clearVoiceState(testRoomId);

      const participants = await voiceStateService.getVoiceParticipants(testRoomId);
      const peerIds = await voiceStateService.getVoicePeerIds(testRoomId);

      expect(participants).toEqual([]);
      expect(peerIds).toEqual([]);
    });
  });

  describe('Multiple Participants Flow', () => {
    it('should handle full voice chat flow with multiple participants', async () => {
      // Add participants
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-alice');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-bob');
      await voiceStateService.addVoiceParticipant(testRoomId, 'oder-charlie');

      // Verify all added
      let participants = await voiceStateService.getVoiceParticipants(testRoomId);
      expect(participants).toHaveLength(3);

      // Alice starts speaking
      await voiceStateService.updateSpeakingStatus(testRoomId, 'oder-alice', true);
      const alice = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-alice');
      expect(alice?.isSpeaking).toBe(true);

      // Bob leaves
      await voiceStateService.removeVoiceParticipant(testRoomId, 'oder-bob');
      participants = await voiceStateService.getVoiceParticipants(testRoomId);
      expect(participants).toHaveLength(2);

      // Verify Bob is gone but Alice and Charlie remain
      const peerIds = await voiceStateService.getVoicePeerIds(testRoomId);
      expect(peerIds).toContain('oder-alice');
      expect(peerIds).toContain('oder-charlie');
      expect(peerIds).not.toContain('oder-bob');

      // Alice is still speaking
      const aliceAfter = await voiceStateService.getVoiceParticipant(testRoomId, 'oder-alice');
      expect(aliceAfter?.isSpeaking).toBe(true);
    });
  });
});
