/**
 * Authentication Middleware
 * JWT verification and user context injection
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../errors/index.js';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * Middleware to verify JWT token and set user context
 * Required for authenticated routes
 */
export async function authenticateRequired(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();

    // Extract user info from JWT payload
    const payload = request.user as any;
    request.user = {
      userId: payload.userId || payload.id,
      email: payload.email,
      username: payload.username,
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Middleware to optionally verify JWT token
 * Sets user context if token is valid, but doesn't fail if missing
 */
export async function authenticateOptional(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    await request.jwtVerify();

    // Extract user info from JWT payload
    const payload = request.user as any;
    request.user = {
      userId: payload.userId || payload.id,
      email: payload.email,
      username: payload.username,
    };
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    request.user = undefined;
  }
}
