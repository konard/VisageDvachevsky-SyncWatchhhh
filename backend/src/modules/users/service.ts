import { prisma } from '../../common/utils/prisma.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.js';
import { UpdateProfileInput, ChangePasswordInput, UpdateSettingsInput } from './schemas.js';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
  settings: UserSettings | null;
}

export interface UserSettings {
  voiceMode: string;
  pttKey: string;
  vadThreshold: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  soundEffectsEnabled: boolean;
  notificationsEnabled: boolean;
  theme: string;
}

export class UsersService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        settings: {
          select: {
            voiceMode: true,
            pttKey: true,
            vadThreshold: true,
            noiseSuppression: true,
            echoCancellation: true,
            soundEffectsEnabled: true,
            notificationsEnabled: true,
            theme: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    // Check if username is already taken
    if (input.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: input.username,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Username already taken');
      }
    }

    // Check if email is already in use
    if (input.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: input.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        settings: {
          select: {
            voiceMode: true,
            pttKey: true,
            vadThreshold: true,
            noiseSuppression: true,
            echoCancellation: true,
            soundEffectsEnabled: true,
            notificationsEnabled: true,
            theme: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        settings: {
          select: {
            voiceMode: true,
            pttKey: true,
            vadThreshold: true,
            noiseSuppression: true,
            echoCancellation: true,
            soundEffectsEnabled: true,
            notificationsEnabled: true,
            theme: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    // Get current password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(input.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens to force re-login
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    // Delete user (cascade will handle related data)
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<UserSettings> {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        voiceMode: true,
        pttKey: true,
        vadThreshold: true,
        noiseSuppression: true,
        echoCancellation: true,
        soundEffectsEnabled: true,
        notificationsEnabled: true,
        theme: true,
      },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
        select: {
          voiceMode: true,
          pttKey: true,
          vadThreshold: true,
          noiseSuppression: true,
          echoCancellation: true,
          soundEffectsEnabled: true,
          notificationsEnabled: true,
          theme: true,
        },
      });
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, input: UpdateSettingsInput): Promise<UserSettings> {
    // Ensure settings exist
    await this.getSettings(userId);

    const settings = await prisma.userSettings.update({
      where: { userId },
      data: input,
      select: {
        voiceMode: true,
        pttKey: true,
        vadThreshold: true,
        noiseSuppression: true,
        echoCancellation: true,
        soundEffectsEnabled: true,
        notificationsEnabled: true,
        theme: true,
      },
    });

    return settings;
  }
}
