import { stateRedis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

const VOICE_STATE_TTL = 24 * 60 * 60; // 24 hours

export interface VoiceParticipant {
  oderId: string;
  isSpeaking: boolean;
  joinedAt: string;
}

/**
 * Voice State Service
 * Manages voice chat state in Redis for WebRTC signaling
 */
export class VoiceStateService {
  /**
   * Get all voice participants in a room
   */
  async getVoiceParticipants(roomId: string): Promise<VoiceParticipant[]> {
    try {
      const key = `room:${roomId}:voice:participants`;
      const data = await stateRedis.get(key);

      if (!data) {
        return [];
      }

      return JSON.parse(data) as VoiceParticipant[];
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get voice participants');
      throw error;
    }
  }

  /**
   * Get voice participant by oderId
   */
  async getVoiceParticipant(roomId: string, oderId: string): Promise<VoiceParticipant | null> {
    try {
      const participants = await this.getVoiceParticipants(roomId);
      return participants.find((p) => p.oderId === oderId) || null;
    } catch (error) {
      logger.error(
        { error: (error as Error).message, roomId, oderId },
        'Failed to get voice participant'
      );
      throw error;
    }
  }

  /**
   * Add participant to voice chat
   */
  async addVoiceParticipant(roomId: string, oderId: string): Promise<void> {
    try {
      const key = `room:${roomId}:voice:participants`;
      const participants = await this.getVoiceParticipants(roomId);

      // Check if participant already exists
      const exists = participants.some((p) => p.oderId === oderId);
      if (!exists) {
        const participant: VoiceParticipant = {
          oderId,
          isSpeaking: false,
          joinedAt: new Date().toISOString(),
        };

        participants.push(participant);
        await stateRedis.setex(key, VOICE_STATE_TTL, JSON.stringify(participants));

        logger.debug({ roomId, oderId }, 'Voice participant added');
      }
    } catch (error) {
      logger.error(
        { error: (error as Error).message, roomId, oderId },
        'Failed to add voice participant'
      );
      throw error;
    }
  }

  /**
   * Remove participant from voice chat
   */
  async removeVoiceParticipant(roomId: string, oderId: string): Promise<void> {
    try {
      const key = `room:${roomId}:voice:participants`;
      const participants = await this.getVoiceParticipants(roomId);

      const filtered = participants.filter((p) => p.oderId !== oderId);
      await stateRedis.setex(key, VOICE_STATE_TTL, JSON.stringify(filtered));

      logger.debug({ roomId, oderId }, 'Voice participant removed');
    } catch (error) {
      logger.error(
        { error: (error as Error).message, roomId, oderId },
        'Failed to remove voice participant'
      );
      throw error;
    }
  }

  /**
   * Update speaking status for a participant
   */
  async updateSpeakingStatus(roomId: string, oderId: string, isSpeaking: boolean): Promise<void> {
    try {
      const key = `room:${roomId}:voice:participants`;
      const participants = await this.getVoiceParticipants(roomId);

      const participant = participants.find((p) => p.oderId === oderId);
      if (participant) {
        participant.isSpeaking = isSpeaking;
        await stateRedis.setex(key, VOICE_STATE_TTL, JSON.stringify(participants));

        logger.debug({ roomId, oderId, isSpeaking }, 'Speaking status updated');
      }
    } catch (error) {
      logger.error(
        { error: (error as Error).message, roomId, oderId },
        'Failed to update speaking status'
      );
      throw error;
    }
  }

  /**
   * Check if participant is in voice chat
   */
  async isInVoice(roomId: string, oderId: string): Promise<boolean> {
    try {
      const participants = await this.getVoiceParticipants(roomId);
      return participants.some((p) => p.oderId === oderId);
    } catch (error) {
      logger.error(
        { error: (error as Error).message, roomId, oderId },
        'Failed to check voice status'
      );
      throw error;
    }
  }

  /**
   * Get all oderId values of participants in voice chat
   */
  async getVoicePeerIds(roomId: string): Promise<string[]> {
    try {
      const participants = await this.getVoiceParticipants(roomId);
      return participants.map((p) => p.oderId);
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to get voice peer IDs');
      throw error;
    }
  }

  /**
   * Clear all voice state for a room
   */
  async clearVoiceState(roomId: string): Promise<void> {
    try {
      const key = `room:${roomId}:voice:participants`;
      await stateRedis.del(key);

      logger.debug({ roomId }, 'Voice state cleared');
    } catch (error) {
      logger.error({ error: (error as Error).message, roomId }, 'Failed to clear voice state');
      throw error;
    }
  }
}

export const voiceStateService = new VoiceStateService();
