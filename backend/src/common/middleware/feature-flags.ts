/**
 * Feature Flags Middleware
 * Enables gradual rollout of new features and A/B testing
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../../database/redis.js';
import { logger } from '../../config/logger.js';

/**
 * Feature flag configuration
 */
interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  allowedUserIds?: string[]; // Specific users who have access
  enabledForAll?: boolean; // Override percentage-based rollout
}

/**
 * Default feature flags
 */
const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  analytics: {
    name: 'analytics',
    enabled: true,
    enabledForAll: true,
  },
  diagnostics: {
    name: 'diagnostics',
    enabled: true,
    enabledForAll: true,
  },
  // Example gradual rollout:
  // newSyncAlgorithm: {
  //   name: 'newSyncAlgorithm',
  //   enabled: true,
  //   rolloutPercentage: 10, // 10% of users
  // },
};

/**
 * Get feature flag from Redis or defaults
 */
async function getFeatureFlag(name: string): Promise<FeatureFlag | null> {
  try {
    const cached = await redis.get(`feature_flag:${name}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.error({ error, flagName: name }, 'Failed to fetch feature flag from Redis');
  }

  return DEFAULT_FLAGS[name] || null;
}

/**
 * Check if feature is enabled for a specific user
 */
export async function isFeatureEnabled(
  featureName: string,
  userId?: string
): Promise<boolean> {
  const flag = await getFeatureFlag(featureName);

  if (!flag || !flag.enabled) {
    return false;
  }

  // If enabled for all users
  if (flag.enabledForAll) {
    return true;
  }

  // If user is in allowlist
  if (userId && flag.allowedUserIds?.includes(userId)) {
    return true;
  }

  // Percentage-based rollout
  if (flag.rolloutPercentage !== undefined) {
    if (!userId) {
      return false; // Cannot do percentage rollout without user ID
    }

    // Deterministic hash-based rollout (same user always gets same result)
    const hash = hashUserId(userId);
    const bucket = hash % 100; // 0-99
    return bucket < flag.rolloutPercentage;
  }

  return false;
}

/**
 * Simple hash function for user ID (for deterministic rollout)
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Middleware to check if feature is enabled
 * Returns 404 if feature is not enabled for the user
 */
export function requireFeature(featureName: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user?.id;
    const enabled = await isFeatureEnabled(featureName, userId);

    if (!enabled) {
      logger.debug(
        {
          featureName,
          userId,
          path: request.url,
        },
        'Feature not enabled for user'
      );

      return reply.code(404).send({
        error: 'Not Found',
        message: 'The requested feature is not available',
      });
    }
  };
}

/**
 * Set feature flag (for admin/configuration)
 */
export async function setFeatureFlag(
  name: string,
  config: FeatureFlag
): Promise<void> {
  try {
    await redis.set(
      `feature_flag:${name}`,
      JSON.stringify(config),
      'EX',
      3600 // Cache for 1 hour
    );
    logger.info({ flagName: name, config }, 'Feature flag updated');
  } catch (error) {
    logger.error({ error, flagName: name }, 'Failed to set feature flag');
    throw error;
  }
}

/**
 * Get all feature flags (for debugging)
 */
export async function getAllFeatureFlags(): Promise<Record<string, FeatureFlag>> {
  const flags: Record<string, FeatureFlag> = { ...DEFAULT_FLAGS };

  try {
    const keys = await redis.keys('feature_flag:*');
    const values = await Promise.all(keys.map((key) => redis.get(key)));

    keys.forEach((key, index) => {
      const name = key.replace('feature_flag:', '');
      if (values[index]) {
        try {
          flags[name] = JSON.parse(values[index]!);
        } catch {
          // Ignore parse errors
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch all feature flags');
  }

  return flags;
}
