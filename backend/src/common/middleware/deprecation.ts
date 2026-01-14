/**
 * API Deprecation Middleware
 * Adds deprecation headers and tracks deprecated endpoint usage
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger.js';
import { analyticsService, EventNames, EventCategory } from '../../modules/analytics/service.js';

/**
 * Deprecated endpoint configuration
 */
interface DeprecatedEndpoint {
  path: string | RegExp;
  method?: string;
  deprecatedSince: string; // Version when deprecated
  sunsetDate?: string; // ISO date when endpoint will be removed
  replacement?: string; // URL of replacement endpoint
  message?: string; // Custom deprecation message
}

/**
 * Registry of deprecated endpoints
 */
const DEPRECATED_ENDPOINTS: DeprecatedEndpoint[] = [
  // Example:
  // {
  //   path: /^\/api\/v1\/rooms\/\w+\/participants$/,
  //   method: 'GET',
  //   deprecatedSince: 'v1.0',
  //   sunsetDate: '2026-06-01T00:00:00Z',
  //   replacement: '/api/v2/rooms/:id/members',
  //   message: 'Use /api/v2/rooms/:id/members for enhanced participant info',
  // }
];

/**
 * Check if endpoint is deprecated
 */
function findDeprecatedEndpoint(
  path: string,
  method: string
): DeprecatedEndpoint | null {
  return (
    DEPRECATED_ENDPOINTS.find((endpoint) => {
      const pathMatches =
        endpoint.path instanceof RegExp
          ? endpoint.path.test(path)
          : endpoint.path === path;
      const methodMatches = !endpoint.method || endpoint.method === method;
      return pathMatches && methodMatches;
    }) || null
  );
}

/**
 * Deprecation warning middleware
 * Adds X-Deprecated and X-Sunset headers to deprecated endpoints
 */
export function deprecationMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const deprecated = findDeprecatedEndpoint(request.url, request.method);

    if (deprecated) {
      // Add deprecation headers
      reply.header('X-Deprecated', 'true');
      reply.header('X-Deprecated-Since', deprecated.deprecatedSince);

      if (deprecated.sunsetDate) {
        reply.header('X-Sunset', deprecated.sunsetDate);
      }

      if (deprecated.replacement) {
        reply.header('X-Replacement', deprecated.replacement);
      }

      // Add Deprecation header (RFC 8594)
      reply.header('Deprecation', 'true');

      // Log deprecation warning
      logger.warn(
        {
          path: request.url,
          method: request.method,
          deprecatedSince: deprecated.deprecatedSince,
          sunsetDate: deprecated.sunsetDate,
          replacement: deprecated.replacement,
          userAgent: request.headers['user-agent'],
        },
        'Deprecated endpoint accessed'
      );

      // Track deprecated endpoint usage in analytics
      const sessionId = request.headers['x-session-id'] as string || 'unknown';
      const userId = (request as any).user?.id;

      analyticsService.trackEvent({
        sessionId,
        userId,
        eventName: 'deprecated.endpoint_used',
        category: EventCategory.SESSION,
        properties: {
          path: request.url,
          method: request.method,
          deprecatedSince: deprecated.deprecatedSince,
          sunsetDate: deprecated.sunsetDate,
          replacement: deprecated.replacement,
          userAgent: request.headers['user-agent'],
        },
      }).catch((err) => {
        logger.error({ error: err }, 'Failed to track deprecated endpoint usage');
      });
    }
  };
}

/**
 * Helper to mark endpoint as deprecated (for use in route definitions)
 */
export function markDeprecated(config: {
  since: string;
  sunsetDate?: string;
  replacement?: string;
  message?: string;
}): void {
  // This is a declarative marker for documentation
  // Actual deprecation tracking happens in middleware
  logger.info({ config }, 'Endpoint marked as deprecated');
}
