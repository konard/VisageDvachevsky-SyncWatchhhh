/**
 * Room Template Service
 * Manages room templates for quick room creation
 */

import { prisma } from '../../database/client.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../../common/errors/index.js';
import type { RoomTemplate, CreateRoomTemplateInput } from './types.js';

export class RoomTemplateService {
  /**
   * Create a room template
   */
  async createTemplate(
    userId: string,
    input: CreateRoomTemplateInput
  ): Promise<RoomTemplate> {
    // If this is being set as default, unset any existing default
    if (input.isDefault) {
      await prisma.roomTemplate.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const template = await prisma.roomTemplate.create({
      data: {
        userId,
        name: input.name,
        isDefault: input.isDefault ?? false,
        settings: JSON.stringify(input.settings),
      },
    });

    return {
      ...template,
      settings: JSON.parse(template.settings as string),
    };
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<RoomTemplate> {
    const template = await prisma.roomTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundError('Template');
    }

    return {
      ...template,
      settings: JSON.parse(template.settings as string),
    };
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId: string): Promise<RoomTemplate[]> {
    const templates = await prisma.roomTemplate.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return templates.map((t) => ({
      ...t,
      settings: JSON.parse(t.settings as string),
    }));
  }

  /**
   * Get user's default template
   */
  async getDefaultTemplate(userId: string): Promise<RoomTemplate | null> {
    const template = await prisma.roomTemplate.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!template) {
      return null;
    }

    return {
      ...template,
      settings: JSON.parse(template.settings as string),
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    userId: string,
    updates: Partial<CreateRoomTemplateInput>
  ): Promise<RoomTemplate> {
    const template = await this.getTemplate(id);

    if (template.userId !== userId) {
      throw new ForbiddenError('You can only update your own templates');
    }

    // If setting as default, unset any other defaults
    if (updates.isDefault && !template.isDefault) {
      await prisma.roomTemplate.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const data: any = {};
    if (updates.name) data.name = updates.name;
    if (updates.isDefault !== undefined) data.isDefault = updates.isDefault;
    if (updates.settings) data.settings = JSON.stringify(updates.settings);

    const updated = await prisma.roomTemplate.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      settings: JSON.parse(updated.settings as string),
    };
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    const template = await this.getTemplate(id);

    if (template.userId !== userId) {
      throw new ForbiddenError('You can only delete your own templates');
    }

    await prisma.roomTemplate.delete({
      where: { id },
    });
  }

  /**
   * Set template as default
   */
  async setAsDefault(id: string, userId: string): Promise<RoomTemplate> {
    const template = await this.getTemplate(id);

    if (template.userId !== userId) {
      throw new ForbiddenError('You can only set your own templates as default');
    }

    // Unset any existing default
    await prisma.roomTemplate.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this template as default
    const updated = await prisma.roomTemplate.update({
      where: { id },
      data: { isDefault: true },
    });

    return {
      ...updated,
      settings: JSON.parse(updated.settings as string),
    };
  }

  /**
   * Get template count for user
   */
  async getTemplateCount(userId: string): Promise<number> {
    return await prisma.roomTemplate.count({
      where: { userId },
    });
  }
}
