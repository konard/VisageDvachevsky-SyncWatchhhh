/**
 * API Versioning Middleware
 * Supports URL-based versioning (/api/v1, /api/v2) and header-based version hints
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger.js';

/**
 * Current API version
 */
export const CURRENT_API_VERSION = 'v1';

/**
 * Supported API versions
 */
export const SUPPORTED_API_VERSIONS = ['v1'];

/**
 * Extract API version from request URL or header
 */
export function getApiVersion(request: FastifyRequest): string {
  // Check URL path for version (e.g., /api/v1/rooms)
  const urlMatch = request.url.match(/^\/api\/(v\d+)\//);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Check Accept-Version header
  const headerVersion = request.headers['accept-version'] as string;
  if (headerVersion && headerVersion.match(/^v\d+$/)) {
    return headerVersion;
  }

  // Default to current version
  return CURRENT_API_VERSION;
}

/**
 * Validate if API version is supported
 */
export function isVersionSupported(version: string): boolean {
  return SUPPORTED_API_VERSIONS.includes(version);
}

/**
 * API version validation middleware
 * Rejects unsupported API versions
 */
export function apiVersionMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const version = getApiVersion(request);

    if (!isVersionSupported(version)) {
      logger.warn(
        {
          version,
          url: request.url,
          userAgent: request.headers['user-agent'],
        },
        'Unsupported API version requested'
      );

      return reply.code(400).send({
        error: 'Unsupported API Version',
        message: `API version ${version} is not supported. Supported versions: ${SUPPORTED_API_VERSIONS.join(', ')}`,
        supportedVersions: SUPPORTED_API_VERSIONS,
        currentVersion: CURRENT_API_VERSION,
      });
    }

    // Store version in request context for later use
    (request as any).apiVersion = version;

    // Add API version to response headers
    reply.header('X-API-Version', version);
  };
}

/**
 * Get API version from request context
 */
export function getRequestApiVersion(request: FastifyRequest): string {
  return (request as any).apiVersion || CURRENT_API_VERSION;
}
