/**
 * Moderation Module
 * Exports for abuse protection and moderation features
 */

export { ModerationService } from './service.js';
export { moderationRoutes } from './routes.js';
export * from './schemas.js';

// Create singleton instance for use in other modules
import { ModerationService } from './service.js';
export const moderationService = new ModerationService();
