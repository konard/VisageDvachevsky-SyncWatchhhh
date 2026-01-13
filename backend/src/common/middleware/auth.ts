/**
 * Authentication Middleware
 * JWT verification and user context injection
 */

import { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../errors/index.js';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthUser;
  }
}

/**
 * Middleware to verify JWT token and set user context
 * Required for authenticated routes
 */
export async function authenticateRequired(
  request: FastifyRequest
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (_error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Middleware to optionally verify JWT token
 * Sets user context if token is valid, but doesn't fail if missing
 */
export async function authenticateOptional(
  request: FastifyRequest
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    await request.jwtVerify();
  } catch (_error) {
    // Silently ignore invalid tokens for optional auth
  }
}
