import { describe, it, expect } from 'vitest';
import { updateProfileSchema, changePasswordSchema, updateSettingsSchema } from '../schemas.js';

describe('Users Schemas', () => {
  describe('updateProfileSchema', () => {
    it('should validate valid profile update with username', () => {
      const validData = {
        username: 'newusername',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid profile update with email', () => {
      const validData = {
        email: 'newemail@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid profile update with both fields', () => {
      const validData = {
        username: 'newusername',
        email: 'newemail@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate empty update', () => {
      const validData = {};

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const invalidData = {
        username: 'ab',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject long username', () => {
      const invalidData = {
        username: 'a'.repeat(21),
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject extra fields', () => {
      const invalidData = {
        username: 'newusername',
        extraField: 'value',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid password change', () => {
      const validData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing current password', () => {
      const invalidData = {
        newPassword: 'newpassword123',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing new password', () => {
      const invalidData = {
        currentPassword: 'oldpassword',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short new password', () => {
      const invalidData = {
        currentPassword: 'oldpassword',
        newPassword: 'short',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too long new password', () => {
      const invalidData = {
        currentPassword: 'oldpassword',
        newPassword: 'a'.repeat(73),
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateSettingsSchema', () => {
    it('should validate valid voice mode update', () => {
      const validData = {
        voiceMode: 'push_to_talk',
      };

      const result = updateSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid PTT key update', () => {
      const validData = {
        pttKey: 'KeyT',
      };

      const result = updateSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid VAD threshold update', () => {
      const validData = {
        vadThreshold: 0.7,
      };

      const result = updateSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid boolean settings', () => {
      const validData = {
        noiseSuppression: false,
        echoCancellation: true,
        soundEffectsEnabled: false,
        notificationsEnabled: true,
      };

      const result = updateSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid theme update', () => {
      const validData = {
        theme: 'light',
      };

      const result = updateSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all settings together', () => {
      const validData = {
        voiceMode: 'voice_activity',
        pttKey: 'Space',
        vadThreshold: 0.5,
        noiseSuppression: true,
        echoCancellation: true,
        soundEffectsEnabled: true,
        notificationsEnabled: true,
        theme: 'dark',
      };

      const result = updateSettingsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid voice mode', () => {
      const invalidData = {
        voiceMode: 'invalid_mode',
      };

      const result = updateSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject VAD threshold below 0', () => {
      const invalidData = {
        vadThreshold: -0.1,
      };

      const result = updateSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject VAD threshold above 1', () => {
      const invalidData = {
        vadThreshold: 1.1,
      };

      const result = updateSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid theme', () => {
      const invalidData = {
        theme: 'purple',
      };

      const result = updateSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject extra fields', () => {
      const invalidData = {
        theme: 'dark',
        extraField: 'value',
      };

      const result = updateSettingsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
